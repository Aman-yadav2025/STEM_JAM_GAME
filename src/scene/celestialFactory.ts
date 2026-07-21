import { Vector3 } from '../physics/vector3';
import { type CelestialBody, computeSOIRadius } from '../physics/constants';
import { type MovingBody, type OrbitPath } from '../physics/orbitPath';

// --- CONFIGURATION SPECS ---

export interface MoonSpec {
  name: string;
  radius: number;
  color: string;
  orbitalPeriod: number; // Seconds per revolution
  /** Explicit mass override. If omitted, calculated dynamically from radius and density. */
  mass?: number;
  initialAngle?: number; // Radians at t=0 (default: distributed automatically)
  /** Orbital distance as a multiplier of parent planet radius (default: 3.5 + index * 1.8) */
  orbitMultiplier?: number;
  /** Explicit orbital radius in world units (overrides orbitMultiplier if supplied) */
  orbitalRadius?: number;
  /** Density scale for mass calculation (default: 1.0) */
  density?: number;
  /** Explicit SOI override. If omitted, uses computeSOIRadius or dynamic fallback */
  soiRadius?: number;
}

export interface PlanetSpec {
  name: string;
  radius: number;
  sunDistance: number;
  orbitalPeriod: number; // Seconds per revolution
  color: string;
  /** Explicit mass override. If omitted, calculated dynamically from radius and density. */
  mass?: number;
  initialAngle?: number; // Radians at t=0 (default: 0)
  /** Density scale for mass calculation (default: 1.5) */
  density?: number;
  /** Explicit SOI override. If omitted, dynamically calculated based on Sun & Moon extent */
  soiRadius?: number;
  moons?: MoonSpec[];
}

export interface SunSpec {
  name?: string;
  radius?: number;
  mass?: number;
  color?: string;
  position?: Vector3;
}

// --- FACTORY BUILDERS ---

/**
 * Creates the central star / fixed root body.
 */
export function createSun(spec: SunSpec = {}): MovingBody {
  return {
    name: spec.name ?? 'Sun',
    mass: spec.mass ?? 27_192_370,
    radius: spec.radius ?? 140,
    position: spec.position ?? Vector3.zero(),
    soiRadius: Infinity,
    color: spec.color ?? 'yellow',
  };
}

/**
 * Dynamically builds a Planet and all its child Moons relative to the planet's radius.
 * All dependent properties (Mass, Moon Distances, Moon SOIs, Planet SOI) scale automatically.
 */
export function createPlanetSystem(
  sun: MovingBody,
  spec: PlanetSpec
): MovingBody[] {
  const planetDensity = spec.density ?? 1.5;
  const planetAngle = spec.initialAngle ?? 0;

  // 1. Calculate Planet Mass (use explicit spec.mass if provided, else compute from volume/density)
  const planetMass =
    spec.mass ?? Math.round(Math.pow(spec.radius, 3) * planetDensity * 1.5);

  // 2. Initial Planet Position at t=0
  const planetPos = sun.position.add(
    new Vector3(
      spec.sunDistance * Math.cos(planetAngle),
      spec.sunDistance * Math.sin(planetAngle),
      0
    )
  );

  // 3. Base Planet Definition
  const planet: MovingBody = {
    name: spec.name,
    mass: planetMass,
    radius: spec.radius,
    position: planetPos,
    soiRadius: 0, // Placeholder until moons are processed
    color: spec.color,
    orbit: {
      parentBody: sun,
      orbitalRadius: spec.sunDistance,
      orbitalPeriod: spec.orbitalPeriod,
      initialAngle: planetAngle,
    },
  };

  const systemBodies: MovingBody[] = [planet];
  let maxMoonOuterReach = 0;

  // 4. Process Moons
  if (spec.moons && spec.moons.length > 0) {
    spec.moons.forEach((moonSpec, index) => {
      const moonDensity = moonSpec.density ?? 1.0;

      // Calculate Moon Mass (use explicit moonSpec.mass if provided, else compute)
      const moonMass =
        moonSpec.mass ?? Math.round(Math.pow(moonSpec.radius, 3) * moonDensity);

      // Calculate orbital distance dynamically if multiplier isn't explicit
      const multiplier = moonSpec.orbitMultiplier ?? (3.5 + index * 1.8);
      const moonOrbitRadius =
        moonSpec.orbitalRadius ?? spec.radius * multiplier;
      const moonAngle = moonSpec.initialAngle ?? index * 0.8;

      // Position relative to Planet at t=0
      const moonPos = planetPos.add(
        new Vector3(
          moonOrbitRadius * Math.cos(moonAngle),
          moonOrbitRadius * Math.sin(moonAngle),
          0
        )
      );

      // Compute Moon SOI via Hill Sphere or fallback
      const calculatedMoonSOI = computeSOIRadius(
        moonOrbitRadius,
        moonMass,
        planetMass
      );
      const moonSoiRadius =
        moonSpec.soiRadius ??
        Math.max(Math.round(calculatedMoonSOI), moonSpec.radius * 2);

      const moon: MovingBody = {
        name: moonSpec.name,
        mass: moonMass,
        radius: moonSpec.radius,
        position: moonPos,
        soiRadius: moonSoiRadius,
        color: moonSpec.color,
        orbit: {
          parentBody: planet,
          orbitalRadius: moonOrbitRadius,
          orbitalPeriod: moonSpec.orbitalPeriod,
          initialAngle: moonAngle,
        },
      };

      systemBodies.push(moon);

      // Track outer extent of moon system to guarantee Planet SOI encapsulates all moons
      const outerReach = moonOrbitRadius + moonSoiRadius * 2.5;
      if (outerReach > maxMoonOuterReach) {
        maxMoonOuterReach = outerReach;
      }
    });
  }

  // 5. Compute Planet SOI (Hill sphere or moon containment floor)
  const physicsPlanetSOI = computeSOIRadius(
    spec.sunDistance,
    planetMass,
    sun.mass
  );

  if (spec.soiRadius) {
    planet.soiRadius = spec.soiRadius;
  } else {
    // Ensure Planet SOI safely encloses all moon orbits + margins
    planet.soiRadius = Math.max(
      Math.round(physicsPlanetSOI),
      Math.ceil(maxMoonOuterReach + spec.radius * 1.5),
      spec.radius * 6
    );
  }

  return systemBodies;
}

/**
 * Helper to build an entire solar system in one call.
 */
export function buildSolarSystem(
  sunSpec: SunSpec,
  planetSpecs: PlanetSpec[]
): MovingBody[] {
  const sun = createSun(sunSpec);
  const bodies: MovingBody[] = [sun];

  for (const pSpec of planetSpecs) {
    const planetSystem = createPlanetSystem(sun, pSpec);
    bodies.push(...planetSystem);
  }

  return bodies;
}