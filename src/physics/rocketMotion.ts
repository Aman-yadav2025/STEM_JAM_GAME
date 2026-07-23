import { CONSTANT_DT, G, type CelestialBody, type Spacecraft, type BurnDirection, type FlightInputState } from "./constants";
import { STANDARD_g, type EngineSpec } from "./rocketEquation";
import { Vector3 } from "./vector3";
import { getDominantBody, DominantAccel } from "./gravity";
import { getBurnDirectionVector } from "./burn";
import { updateBodyPositions, type OrbitPath } from "./orbitPath";
import * as THREE from "three";

type MovingBody = CelestialBody & { orbit?: OrbitPath };

export interface RocketMotionResult {
  ship: Spacecraft;
  t: number;
}

// Ship's local "nose" direction in model space. Flip to (0,0,1) if the
// ship visually flies backwards once this is running.
const LOCAL_FORWARD = new THREE.Vector3(0, 0, -1);

function toThreeQuat(o: Spacecraft["orientation"]): THREE.Quaternion {
  return new THREE.Quaternion(o.x, o.y, o.z, o.w);
}

function fromThreeQuat(q: THREE.Quaternion): Spacecraft["orientation"] {
  return { x: q.x, y: q.y, z: q.z, w: q.w };
}

// Derives the ship's world-space forward vector by rotating the local
// forward axis by the ship's current orientation quaternion — replaces
// the old cosPitch/sinYaw Euler reconstruction entirely.
function getShipForwardVector(ship: Spacecraft): Vector3 {
  const q = toThreeQuat(ship.orientation);
  const forward = LOCAL_FORWARD.clone().applyQuaternion(q);
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
const MAX_SUBSTEPS = 256;
const SAMPLES_PER_ORBIT = 60;

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

  // --- Orientation integration (quaternion, local-space) ---
  // Build a small delta rotation from this frame's stick input, expressed
  // in the ship's OWN local axes (pitch about local X, yaw about local Y,
  // roll about local Z), then POST-multiply it onto the current
  // orientation. Post-multiplication (current.multiply(delta)) is what
  // applies the delta in the object's local frame rather than world
  // space — this is the actual fix: W always means "nose up relative to
  // wherever the nose currently points," regardless of prior rotation.
  const currentOrientation = toThreeQuat(ship.orientation);

  const deltaEuler = new THREE.Euler(
    inputPitch * 2.2 * stepDt,
    inputYaw * 2.2 * stepDt,
    inputRoll * 2.4 * stepDt,
    "XYZ"
  );
  const localDelta = new THREE.Quaternion().setFromEuler(deltaEuler);

  const newOrientationQ = currentOrientation.clone().multiply(localDelta).normalize();
  const newOrientation = fromThreeQuat(newOrientationQ);

  // Cosmetic-only Euler decomposition, kept for any HUD/minimap code that
  // still reads ship.pitch/yaw/roll/heading. Never fed back into physics.
  const displayEuler = new THREE.Euler().setFromQuaternion(newOrientationQ, "YXZ");

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
      const currentThrustForce = engine.maxThrust * (usingAutopilot ? _throttle : 1);
      const totalShipMass = ship.mass + fuel;
      const engineAccMagnitude = currentThrustForce / totalShipMass;
      const directionVector = usingAutopilot
        ? getBurnDirectionVector(
            { ...ship, position, velocity, fuel },
            bodies,
            _activeBurnDirection!,
            interceptTarget
          )
        : getShipForwardVector({ ...ship, orientation: newOrientation });
      thrustAcceleration = directionVector.scale(engineAccMagnitude);

      const vE = engine.specificImpulse * STANDARD_g;
      const massFlowRate = currentThrustForce / vE;
      const burned = Math.min(fuel, massFlowRate * subDt);
      totalFuelBurned += burned;
      fuel = Math.max(0, fuel - burned);
    } else {
      thrustAcceleration = Vector3.zero();
    }

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
      orientation: newOrientation,
      pitch: displayEuler.x,
      yaw: displayEuler.y,
      roll: displayEuler.z,
      heading: displayEuler.y,
    },
    t: t + stepDt,
  };
}