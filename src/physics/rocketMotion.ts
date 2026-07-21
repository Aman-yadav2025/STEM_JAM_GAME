import { CONSTANT_DT, G, type CelestialBody, type Spacecraft, type BurnDirection, type FlightInputState } from "./constants";
import { STANDARD_g, type EngineSpec } from "./rocketEquation";
import { Vector3 } from "./vector3";
import { totalAccelNBody, getDominantBody, DominantAccel } from "./gravity";
import { updateBodyPositions, type OrbitPath } from "./orbitPath";

type MovingBody = CelestialBody & { orbit?: OrbitPath };

export interface RocketMotionResult {
  ship: Spacecraft;
  t: number;
}

function getShipForwardVector(ship: Spacecraft): Vector3 {
  const cosPitch = Math.cos(ship.pitch);
  const sinPitch = Math.sin(ship.pitch);
  const cosYaw = Math.cos(ship.yaw);
  const sinYaw = Math.sin(ship.yaw);
  return new Vector3(cosPitch * cosYaw, sinPitch, cosPitch * sinYaw);
}

// Rough local Kepler period around whichever body currently dominates,
// used only to size the integration substep — doesn't need to be exact.
function localOrbitalPeriod(shipPos: Vector3, bodies: MovingBody[]): number {
  const dominant = getDominantBody(shipPos, bodies);
  const r = shipPos.distanceTo(dominant.position);
  if (r === 0 || dominant.mass <= 0) return Infinity;
  return 2 * Math.PI * Math.sqrt((r * r * r) / (G * dominant.mass));
}

const MIN_SUBSTEPS = 1;
const MAX_SUBSTEPS = 64;        // hard cap so a near-singular r can't blow up perf
const SAMPLES_PER_ORBIT = 60;   // resolution target: ~60 samples per local orbit

function chooseSubstepCount(shipPos: Vector3, bodies: MovingBody[], stepDt: number): number {
  const period = localOrbitalPeriod(shipPos, bodies);
  if (!isFinite(period) || period <= 0) return MIN_SUBSTEPS;
  const idealSubDt = period / SAMPLES_PER_ORBIT;
  const needed = Math.ceil(stepDt / idealSubDt);
  return Math.min(MAX_SUBSTEPS, Math.max(MIN_SUBSTEPS, needed));
}

export function updateShipPhysics(
  ship: Spacecraft,
  bodies: MovingBody[],
  engine: EngineSpec,
  _activeBurnDirection: BurnDirection | null,
  _throttle: number = 1.0,
  t: number,
  dt: number = CONSTANT_DT,
  flightInput?: FlightInputState
): RocketMotionResult {
  const stepDt = dt;

  const inputPitch = flightInput?.pitch ?? 0;
  const inputYaw = flightInput?.yaw ?? 0;
  const inputRoll = flightInput?.roll ?? 0;
  const thrusting = flightInput?.thrusting ?? false;

  // Orientation and fuel burn are integrated once over the full frame —
  // only the orbital mechanics needs the finer substep.
  const newPitch = ship.pitch + inputPitch * 2.2 * stepDt;
  const newYaw = ship.yaw + inputYaw * 2.2 * stepDt;
  const newRoll = ship.roll + inputRoll * 2.4 * stepDt;

  let thrustAcceleration = Vector3.zero();
  let totalFuelBurned = 0;

  const numSubsteps = chooseSubstepCount(ship.position, bodies, stepDt);
  const subDt = stepDt / numSubsteps;

  let position = ship.position;
  let velocity = ship.velocity;
  let fuel = ship.fuel;
  let subT = t;

  for (let i = 0; i < numSubsteps; i++) {

    if (thrusting && fuel > 0) {
      const currentThrustForce = engine.maxThrust;
      const totalShipMass = ship.mass + fuel;
      const engineAccMagnitude = currentThrustForce / totalShipMass;
      const directionVector = getShipForwardVector({ ...ship, pitch: newPitch, yaw: newYaw, roll: newRoll });
      thrustAcceleration = directionVector.scale(engineAccMagnitude);

      const vE = engine.specificImpulse * STANDARD_g;
      const massFlowRate = currentThrustForce / vE;
      const burned = Math.min(fuel, massFlowRate * subDt);
      totalFuelBurned += burned;
      fuel = Math.max(0, fuel - burned);
    } else {
      thrustAcceleration = Vector3.zero();
    }

    // Replace DominantAccel with totalAccelNBody
    const a0Gravity = DominantAccel(position, bodies);
    const a0Total = a0Gravity.add(thrustAcceleration);

    const newPosition = position
      .add(velocity.scale(subDt))
      .add(a0Total.scale(0.5 * subDt * subDt));

    updateBodyPositions(bodies, subT + subDt);

    const a1Gravity = DominantAccel(newPosition, bodies);
    const a1Total = a1Gravity.add(thrustAcceleration);

    const newVelocity = velocity.add(a0Total.add(a1Total).scale(0.5 * subDt));

    position = newPosition;
    velocity = newVelocity;
    subT += subDt;
  }

  return {
    ship: {
      ...ship,
      position,
      velocity,
      fuel,
      pitch: newPitch,
      yaw: newYaw,
      roll: newRoll,
      heading: newYaw,
    },
    t: t + stepDt,
  };
}