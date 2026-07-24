

export const STANDARD_g = 9.80665; 

export interface EngineSpec {
  specificImpulse: number; // Isp, in seconds — engine efficiency
  maxThrust: number;         // Newtons — max force the engine can output at full throttle
}

export const DEFAULT_ENGINE: EngineSpec = {
  specificImpulse: 10000000,
  maxThrust: 10000000000,
};

/** Converts specific impulse (seconds) to exhaust velocity (game distance units / s). */
export function exhaustVelocity(engine: EngineSpec): number {
  return engine.specificImpulse * STANDARD_g;
}

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