// physics/constants.ts
//
// SCALED UNIT SYSTEM — do not use real-world SI values (real G, kg, meters).
// Real-world numbers produce orbital velocities in the thousands and distances
// in the millions, which wrecks both floating-point precision and on-screen
// readability. Instead we define our own consistent unit system, tuned for
// gameplay feel rather than physical accuracy:
//
//   1 distance unit ≈ "game units" on screen (tune to your camera/zoom)
//   1 mass unit      = arbitrary, chosen so G * M gives sensible accelerations
//   1 time unit       = 1 second of simulated time

import type { Vector3 } from './vector3';

export const G = 6; // tune this first when calibrating a new level

// Fixed physics timestep (seconds). Runs independent of render framerate.
export const CONSTANT_DT = 1 / 120;

// NOTE: as currently consumed in GameLoop.ts (stepDt = CONSTANT_DT *
// SIMULATION_TIME_SCALE, then the accumulator is drained by stepDt per
// tick), this does NOT slow down simulated time relative to real time —
// it only changes step size (smaller steps = more, finer ticks per real
// second, same total simulated time per real second). If you actually want
// simulated time to run slower than real time, GameLoop.ts's accumulator
// needs to advance simulated time by `stepDt`, but only consume
// `stepDt / SIMULATION_TIME_SCALE` of real elapsed time per tick — i.e. the
// scale needs to divide how much of `accumulator` gets drained, not just
// shrink the step size.
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
}

export interface Spacecraft {
  position: Vector3;
  velocity: Vector3;
  mass: number;       // dry mass — fixed, does NOT include fuel
  fuel: number;         // current propellant mass, 0 <= fuel <= maxFuel
  maxFuel: number;       // fuel capacity — fuel can never exceed this
  heading: number;         // radians, cosmetic — align to velocity vector for sprite rotation
  pitch: number;          // radians, local nose-up/nose-down attitude
  yaw: number;            // radians, local left/right attitude
  roll: number;           // radians, local roll attitude
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

/**
 * Adds fuel to the ship, clamped so it never exceeds maxFuel. Use this for
 * any refuel mechanic (pickup, docking) rather than setting ship.fuel
 * directly, so the cap is enforced in exactly one place.
 */
export function addFuel(ship: Spacecraft, amount: number): Spacecraft {
  return { ...ship, fuel: Math.min(ship.maxFuel, ship.fuel + amount) };
}

export type BurnDirection = 
  | 'prograde' 
  | 'retrograde' 
  | 'radialIn' 
  | 'radialOut'
  | 'normal'
  | 'antinormal';

  
/**
 * Hill-sphere approximation of a sphere of influence radius.
 * d = distance between the two bodies, mPrimary = mass of the body being
 * orbited (e.g. planet), mBody = mass of the smaller body (e.g. moon).
 *
 * r_Hill = d * (mBody / (3 * mPrimary)) ^ (1/3)
 *
 * Previously this used `Math.pow(mBody / mPrimary, 2 / 5)` with no factor
 * of 3 — wrong exponent (2/5 instead of 1/3) and missing the /3, which
 * threw off every SOI radius in the game (and the safety margins built on
 * top of them elsewhere, e.g. in celestialFactory.ts).
 */
export function computeSOIRadius(d: number, mBody: number, mPrimary: number): number {
  return d * Math.pow(mBody / (3 * mPrimary), 1 / 3);
}