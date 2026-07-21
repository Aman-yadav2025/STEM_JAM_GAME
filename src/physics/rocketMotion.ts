// physics/rocketMotion.ts
//
// PRIMARY movement function. Called every fixed-timestep tick regardless of
// whether the player is thrusting — handles gravity always, and adds engine
// thrust on top when the player is holding the main engine key.

import { CONSTANT_DT, type CelestialBody, type Spacecraft, type BurnDirection, type FlightInputState } from "./constants";
import { STANDARD_g, type EngineSpec } from "./Rocketequation";
import { Vector3 } from "./vector3";
import { DominantAccel } from "./gravity";
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

  updateBodyPositions(bodies, t);

  const inputPitch = flightInput?.pitch ?? 0;
  const inputYaw = flightInput?.yaw ?? 0;
  const inputRoll = flightInput?.roll ?? 0;
  const thrusting = flightInput?.thrusting ?? false;

  const newPitch = ship.pitch + inputPitch * 2.2 * stepDt;
  const newYaw = ship.yaw + inputYaw * 2.2 * stepDt;
  const newRoll = ship.roll + inputRoll * 2.4 * stepDt;

  let thrustAcceleration = Vector3.zero();
  let fuelBurnedThisFrame = 0;

  if (thrusting && ship.fuel > 0) {
    const currentThrustForce = engine.maxThrust;
    const totalShipMass = ship.mass + ship.fuel;

    const engineAccMagnitude = currentThrustForce / totalShipMass;
    const directionVector = getShipForwardVector({ ...ship, pitch: newPitch, yaw: newYaw, roll: newRoll });
    thrustAcceleration = directionVector.scale(engineAccMagnitude);

    const vE = engine.specificImpulse * STANDARD_g;
    const massFlowRate = currentThrustForce / vE;
    fuelBurnedThisFrame = Math.min(ship.fuel, massFlowRate * stepDt);
  }

  const a0Gravity = DominantAccel(ship.position, bodies);

  const a0Total = a0Gravity.add(thrustAcceleration);
  const newPosition = ship.position
    .add(ship.velocity.scale(stepDt))
    .add(a0Total.scale(0.5 * stepDt * stepDt));

  const a1Gravity = DominantAccel(newPosition, bodies);
  const a1Total = a1Gravity.add(thrustAcceleration);

  const newVelocity = ship.velocity.add(a0Total.add(a1Total).scale(0.5 * stepDt));

  const newFuel = Math.max(0, ship.fuel - fuelBurnedThisFrame);

  return {
    ship: {
      ...ship,
      position: newPosition,
      velocity: newVelocity,
      fuel: newFuel,
      pitch: newPitch,
      yaw: newYaw,
      roll: newRoll,
      heading: newYaw,
    },
    t: t + stepDt,
  };
}

export function checkHazardCollisions(shipPos: Vector3, bodies: MovingBody[]) {
  const distFromSun = shipPos.magnitude();

  if (distFromSun >= 1500 && distFromSun <= 1700) {
    // Ship is inside the asteroid field!
  }

  const saturn = bodies.find((b) => b.name === 'Saturn');
  if (saturn) {
    const distToSaturn = shipPos.distanceTo(saturn.position);
    if (distToSaturn >= 65 && distToSaturn <= 110) {
      // Ship is clipping through Saturn's rings!
    }
  }
}
