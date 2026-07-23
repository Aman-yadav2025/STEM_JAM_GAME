import { CONSTANT_DT, G, type CelestialBody, type Spacecraft, type BurnDirection, type FlightInputState } from "./constants";
import { STANDARD_g, type EngineSpec } from "./rocketEquation";
import { Vector3 } from "./vector3";
import { getDominantBody, DominantAccel } from "./gravity";import { getBurnDirectionVector } from "./burn";import { updateBodyPositions, type OrbitPath } from "./orbitPath";

type MovingBody = CelestialBody & { orbit?: OrbitPath };

export interface RocketMotionResult {
  ship: Spacecraft;
  t: number;
}

import * as THREE from "three";

function getShipForwardVector(ship: Spacecraft): Vector3 {
  const q = new THREE.Quaternion(ship.orientation.x, ship.orientation.y, ship.orientation.z, ship.orientation.w);
  const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(q); // -Z is local forward in WebGL/Three.js
  return new Vector3(forward.x, forward.y, forward.z);
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
// Hard cap so a near-singular r can't blow up perf. Raised from 64 -> 256:
// a hot, close first pass near a massive body (e.g. arriving at Saturn or
// Uranus with significant residual closing speed) can have a local orbital
// period short enough that 64 substeps under-resolves it, letting the
// integrator's energy drift destabilize what should be a capturable orbit.
// 256 gives real headroom for that case; MIN_SUBSTEPS/typical cruise still
// only spends a handful of substeps, so this only costs extra work exactly
// when it's needed (deep, fast encounters).
const MAX_SUBSTEPS = 256;
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
  flightInput?: FlightInputState,
  // NEW: name of the body the autopilot is currently steering toward, if
  // any. Only meaningful when _activeBurnDirection === 'intercept' — every
  // other direction ignores it. Resolved to a live body reference once per
  // call (not per-substep) since updateBodyPositions mutates bodies
  // in-place, so the reference stays current across substeps automatically.
  autopilotTargetName?: string | null
): RocketMotionResult {
  const stepDt = dt;

  const inputPitch = flightInput?.pitch ?? 0;
  const inputYaw = flightInput?.yaw ?? 0;
  const inputRoll = flightInput?.roll ?? 0;
  const manualThrusting = flightInput?.thrusting ?? false;
  const autopilotActive = _activeBurnDirection !== null && _throttle > 0;

  const interceptTarget: MovingBody | null = autopilotTargetName
    ? bodies.find((b) => b.name === autopilotTargetName) ?? null
    : null;

  // Orientation and fuel burn are integrated once over the full frame —
  // Apply WASD inputs as a local rotation to the ship's current quaternion orientation.
  const currentQ = new THREE.Quaternion(ship.orientation.x, ship.orientation.y, ship.orientation.z, ship.orientation.w);
  
  // Create a local rotation quaternion from the inputs (using standard XYZ pitch/yaw/roll local axes)
  const localRot = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(inputPitch * 2.2 * stepDt, inputYaw * 2.2 * stepDt, inputRoll * 2.4 * stepDt, "XYZ")
  );
  
  const newQ = currentQ.multiply(localRot);
  const euler = new THREE.Euler().setFromQuaternion(newQ, "XYZ");

  const newPitch = euler.x;
  const newYaw = euler.y;
  const newRoll = euler.z;

  let thrustAcceleration = Vector3.zero();
  let totalFuelBurned = 0;

  const numSubsteps = chooseSubstepCount(ship.position, bodies, stepDt);
  const subDt = stepDt / numSubsteps;

  let position = ship.position;
  let velocity = ship.velocity;
  let fuel = ship.fuel;
  let subT = t;

  for (let i = 0; i < numSubsteps; i++) {

    const usingAutopilot = autopilotActive && fuel > 0;
    const usingManualThrust = !usingAutopilot && manualThrusting && fuel > 0;

    if (usingAutopilot || usingManualThrust) {
      const manualThrottleVal = (flightInput?.manualThrottle ?? 100) / 100;
      const currentThrustForce = engine.maxThrust * (usingAutopilot ? _throttle : manualThrottleVal);
      const totalShipMass = ship.mass + fuel;
      const engineAccMagnitude = currentThrustForce / totalShipMass;
      const directionVector = usingAutopilot
        ? getBurnDirectionVector(
            { ...ship, position, velocity, fuel },
            bodies,
            _activeBurnDirection!,
            interceptTarget
          )
        : getShipForwardVector({ ...ship, orientation: { x: newQ.x, y: newQ.y, z: newQ.z, w: newQ.w } });
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
      orientation: { x: newQ.x, y: newQ.y, z: newQ.z, w: newQ.w },
      heading: newYaw,
    },
    t: t + stepDt,
  };
}