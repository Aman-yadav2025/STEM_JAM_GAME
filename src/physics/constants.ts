

// import type { quat } from 'gl-matrix';
import type { Vector3 } from './vector3';

export const G = 0.1; // tune this first when calibrating a new level

// Fixed physics timestep (seconds). Runs independent of render framerate.
export const CONSTANT_DT = 1 / 120;

// NOTE: GameLoop.ts applies SIMULATION_TIME_SCALE to the real-frame
// delta before accumulating physics steps. A value below 1 slows simulated
// time relative to wall clock time, while a value above 1 speeds it up.
export const SIMULATION_TIME_SCALE = 0.4;

// Below this eccentricity, an orbit is considered "circular" for win checks.
export const CIRCULAR_ECCENTRICITY_THRESHOLD = 0.02;

export interface CelestialBody {
  name: string;
  mass: number;
  radius: number;    // physical radius — used for surface/crash detection
  position: Vector3;   // may be updated per-frame if the body has an orbit (see bodies.ts)
  soiRadius: number;    // sphere-of-influence radius, for patched-conic gravity switching
  color: string;
}

export interface FlightInputState {
  pitch: number;  // -1..1, forward/back tilt
  yaw: number;    // -1..1, left/right tilt
  roll: number;   // -1..1, roll input
  thrusting: boolean;
  manualThrottle?: number; // 0..100 percentage
}

export interface Spacecraft {
  position: Vector3;
  velocity: Vector3;
  mass: number;       // dry mass — fixed, does NOT include fuel
  fuel: number;         // current propellant mass, 0 <= fuel <= maxFuel
  maxFuel: number;       // fuel capacity — fuel can never exceed this
  health?: number;       // current hull/health (optional to avoid surprises in older saves)
  maxHealth?: number;    // hull capacity
  heading: number;         // radians, cosmetic — align to velocity vector for sprite rotation
  orientation: { x: number; y: number; z: number; w: number };
  pitch: number;     // derived, cosmetic only
  yaw: number;       // derived, cosmetic only
  roll: number;      // derived, cosmetic only
}

/** Total current mass (dry + remaining fuel) — used by gravity/thrust accel calcs. */
export function totalMass(ship: Spacecraft): number {
  return ship.mass + ship.fuel;
}

/** Fuel remaining as a 0..1 fraction of capacity — feed this directly to a HUD gauge. */
export function fuelFraction(ship: Spacecraft): number {
  if (ship.maxFuel <= 0) return 0;
  return ship.fuel / ship.maxFuel;
}


export function addFuel(ship: Spacecraft, amount: number): Spacecraft {
  return { ...ship, fuel: Math.min(ship.maxFuel, ship.fuel + amount) };
}

export type BurnDirection = 
  | 'prograde' 
  | 'retrograde' 
  | 'radialIn' 
  | 'radialOut'
  | 'normal'
  | 'antinormal'
  | 'intercept'
  | 'velocityMatch'
  | 'avoid'
  | 'orbitTangent';

  

export function computeSOIRadius(d: number, mBody: number, mPrimary: number): number {
  return d * Math.pow(mBody / (3 * mPrimary), 1 / 3);
}


