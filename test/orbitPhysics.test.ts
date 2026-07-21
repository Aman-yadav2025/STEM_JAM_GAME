import { describe, expect, it } from 'vitest';
import { updateShipPhysics } from '../src/physics/rocketMotion';
import { DEFAULT_ENGINE } from '../src/physics/rocketEquation';
import { CONSTANT_DT, G, type CelestialBody, type Spacecraft } from '../src/physics/constants';
import { Vector3 } from '../src/physics/vector3';
import { bodyPositionAtTime, type OrbitPath } from '../src/physics/orbitPath';

type MovingBody = CelestialBody & { orbit?: OrbitPath };

function calculateOrbitalVelocity(body: MovingBody): Vector3 {
  if (!body.orbit) return Vector3.zero();

  const omega = (2 * Math.PI) / body.orbit.orbitalPeriod;
  return new Vector3(-omega * body.position.z, 0, omega * body.position.x);
}

function createCircularOrbitScenario() {
  const sun: MovingBody = {
    name: 'Test Sun',
    mass: 27192370,
    radius: 140,
    position: new Vector3(0, 0, 0),
    soiRadius: Infinity,
    color: 'yellow',
  };

  const planetOrbitRadius = 1500;
  const shipOrbitRadius = 50;
  const planetMass = Math.round(Math.pow(35, 3) * 1.5 * 1.5);

  const planet: MovingBody = {
    name: 'Test Planet',
    mass: planetMass,
    radius: 35,
    position: new Vector3(planetOrbitRadius, 0, 0),
    soiRadius: 1000,
    color: 'blue',
    orbit: {
      parentBody: sun,
      orbitalRadius: planetOrbitRadius,
      orbitalPeriod: 70,
      initialAngle: 0,
    },
  };

  const planetVelocity = calculateOrbitalVelocity(planet);
  const shipOrbitalSpeed = Math.sqrt((G * planet.mass) / shipOrbitRadius);

  const ship: Spacecraft = {
    position: planet.position.add(new Vector3(shipOrbitRadius, 0, 0)),
    velocity: planetVelocity.add(new Vector3(0, 0, shipOrbitalSpeed)),
    mass: 1000,
    fuel: 500,
    maxFuel: 500,
    heading: 0,
    pitch: 0,
    yaw: 0,
    roll: 0
  };

  return { sun, planet, ship, planetOrbitRadius, shipOrbitRadius };
}

describe('updateShipPhysics', () => {
  it('keeps a ship in a roughly circular orbit while the planet itself orbits a sun', () => {
    const { sun, planet, ship, planetOrbitRadius, shipOrbitRadius } = createCircularOrbitScenario();

    let currentShip = ship;
    let t = 0;
    let maxShipRadiusError = 0;
    let maxPlanetRadiusError = 0;
    const steps = 600;

    for (let i = 0; i < steps; i += 1) {
      const result = updateShipPhysics(currentShip, [sun, planet], DEFAULT_ENGINE, null, 0, t, CONSTANT_DT);
      currentShip = result.ship;
      t = result.t;

      const shipRadius = currentShip.position.distanceTo(planet.position);
      const planetRadius = planet.position.distanceTo(sun.position);

      maxShipRadiusError = Math.max(maxShipRadiusError, Math.abs(shipRadius - shipOrbitRadius));
      maxPlanetRadiusError = Math.max(maxPlanetRadiusError, Math.abs(planetRadius - planetOrbitRadius));
    }

    const finalShipRadius = currentShip.position.distanceTo(planet.position);
    const finalPlanetRadius = planet.position.distanceTo(sun.position);

    console.log('Final Ship Radius:', finalShipRadius);
    console.log('Final Planet Radius:', finalPlanetRadius);

    expect(finalShipRadius).toBeGreaterThan(shipOrbitRadius * 0.6);
    expect(finalShipRadius).toBeLessThan(shipOrbitRadius * 1.4);
    expect(finalPlanetRadius).toBeGreaterThan(planetOrbitRadius * 0.9);
    expect(finalPlanetRadius).toBeLessThan(planetOrbitRadius * 1.1);
    expect(maxShipRadiusError).toBeLessThan(shipOrbitRadius * 0.8);
    expect(maxPlanetRadiusError).toBeLessThan(planetOrbitRadius * 0.2);
  });
});
