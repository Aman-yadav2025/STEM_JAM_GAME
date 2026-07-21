// physics/rocketEquation.ts
//
// Realistic fuel accounting via the Tsiolkovsky rocket equation:
//
//   Δv = v_e * ln(m0 / m1)
//
// where v_e = exhaust velocity = Isp * g0, m0 = mass before burn,
// m1 = mass after burn. Fuel cost is mass-dependent and nonlinear: the SAME
// Δv costs more propellant mass early (ship heavy/full of fuel) than late
// (ship nearly empty).
//
// NOTE: the project's primary movement function (rocketMotion.ts) computes
// fuel drain per-frame via mass flow rate directly (continuous thrust), not
// through propellantForDeltaV() — that function is for one-shot/instant
// burns only (applyBurn in burn.ts, kept for scripted/NPC burns). The
// functions used every frame regardless of burn style are deltaVBudget()
// and maxDeltaVForPropellant(), for HUD readouts — total achievable Δv from
// a fuel mass is the same whether spent continuously or in one shot, given
// constant Isp.

export const STANDARD_g = 9.80665; // m/s², a defined conversion constant
// (used to convert Isp <-> exhaust velocity; NOT the local gravity of any
// in-game body — fixed by convention regardless of where the ship is)

export interface EngineSpec {
  specificImpulse: number; // Isp, in seconds — engine efficiency
  maxThrust: number;         // Newtons — max force the engine can output at full throttle
}

export const DEFAULT_ENGINE: EngineSpec = {
  specificImpulse: 320, // Isp in seconds (typical chemical engine)
  maxThrust: 22000000,        // tuned to feel like a small but noticeable thruster
};

/** Converts specific impulse (seconds) to exhaust velocity (game distance units / s). */
export function exhaustVelocity(engine: EngineSpec): number {
  return engine.specificImpulse * STANDARD_g;
}

/**
 * Given a desired delta-v and current total ship mass, returns how much
 * propellant MASS is consumed to achieve it in a single instantaneous burn.
 * Used by burn.ts (applyBurn/previewBurn), NOT by the per-frame continuous
 * thrust integrator.
 */
export function propellantForDeltaV(
  deltaV: number,
  currentMass: number,
  engine: EngineSpec
): number {
  const vE = exhaustVelocity(engine);
  const massAfter = currentMass * Math.exp(-Math.abs(deltaV) / vE);
  return currentMass - massAfter;
}

/**
 * Inverse of the above — given how much propellant mass you're willing to
 * spend, returns the maximum delta-v achievable.
 */
export function maxDeltaVForPropellant(
  propellantAvailable: number,
  currentMass: number,
  engine: EngineSpec
): number {
  const vE = exhaustVelocity(engine);
  const massAfter = currentMass - propellantAvailable;
  if (massAfter <= 0) return Infinity;
  return vE * Math.log(currentMass / massAfter);
}

/**
 * Total Δv budget remaining for a ship, given its current fuel load. This is
 * the number to show on a "Δv remaining" HUD readout — informative
 * regardless of whether fuel gets spent continuously or in discrete burns.
 */
export function deltaVBudget(
  dryMass: number,
  fuelMass: number,
  engine: EngineSpec
): number {
  const vE = exhaustVelocity(engine);
  const wetMass = dryMass + fuelMass;
  return vE * Math.log(wetMass / dryMass);
}