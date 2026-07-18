export const STANDARD_g = 9.80665;

export interface EngineSpec{
    specificImpulse: number;
}

export function exhaustVelocity(engine: EngineSpec){
    return engine.specificImpulse * STANDARD_g;
}

export function propellantForDeltaV(
  deltaV: number,
  currentMass: number,
  engine: EngineSpec
): number {
  const vE = exhaustVelocity(engine);
  const massAfter = currentMass * Math.exp(-Math.abs(deltaV) / vE);
  return currentMass - massAfter; // propellant mass burned, always positive
}

export function maxDeltaVForPropellant(
  propellantAvailable: number,
  currentMass: number,
  engine: EngineSpec
): number {
  const vE = exhaustVelocity(engine);
  const massAfter = currentMass - propellantAvailable;
  if (massAfter <= 0) return Infinity; // degenerate case, shouldn't happen in practice
  return vE * Math.log(currentMass / massAfter);
}


// for total delta V available
export function deltaVBudget(
  dryMass: number,
  fuelMass: number,
  engine: EngineSpec
): number {
  const vE = exhaustVelocity(engine);
  const wetMass = dryMass + fuelMass;
  return vE * Math.log(wetMass / dryMass);
}