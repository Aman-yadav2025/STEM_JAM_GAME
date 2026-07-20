// physics/rocketMotion.ts
//
// PRIMARY movement function. Called every fixed-timestep tick regardless of
// whether the player is thrusting — handles gravity always, and adds engine
// thrust on top when the player is holding a direction + throttle.
//
// This replaces applyBurn() as the main player-facing mechanism, because the
// UI gives players (direction, throttle 0..1, held-duration) rather than a
// pre-known delta-v magnitude — that's a rate control, not an impulse
// control, so it needs frame-by-frame integration rather than a one-shot
// rocket-equation calculation.
//
// applyBurn()/rocketEquation.ts's deltaVBudget/maxAvailableDeltaV are still
// used — just for HUD readouts now, not for computing this frame's motion.

import { CONSTANT_DT, type CelestialBody, type Spacecraft, type BurnDirection } from "./constants";
import { STANDARD_g, type EngineSpec } from "./Rocketequation";
import { Vector3 } from "./vector3";
import { DominantAccel } from "./gravity";
import { updateBodyPositions, type OrbitPath } from "./orbitPath";
import { getBurnDirectionVector } from "./burn"; // direction -> unit vector helper

type MovingBody = CelestialBody & { orbit?: OrbitPath };

export interface RocketMotionResult {
  ship: Spacecraft;
  t: number;
}

/**
 * Advances the ship by one fixed timestep under gravity + optional thrust.
 *
 * @param activeBurnDirection - null if the player isn't holding a thrust button
 * @param throttle - 0..1, ignored if activeBurnDirection is null
 * @param t - current simulation time (seconds), BEFORE this step
 */
export function updateShipPhysics(
  ship: Spacecraft,
  bodies: MovingBody[],
  engine: EngineSpec,
  activeBurnDirection: BurnDirection | null,
  throttle: number = 1.0,
  t: number
): RocketMotionResult {
  const dt = CONSTANT_DT;

  // 1. Move celestial bodies to their position at time t first — gravity
  //    this frame must be evaluated against where planets/moons ARE now,
  //    not a stale position from last frame.
  updateBodyPositions(bodies, t);

  // 2. Engine thrust (if the player is actively burning and has fuel).
  let thrustAcceleration = Vector3.zero();
  let fuelBurnedThisFrame = 0;

  if (activeBurnDirection !== null && ship.fuel > 0 && throttle > 0) {
    const clampedThrottle = Math.min(1, Math.max(0, throttle));
    const currentThrustForce = engine.maxThrust * clampedThrottle; // Newtons
    const totalShipMass = ship.mass + ship.fuel;

    const engineAccMagnitude = currentThrustForce / totalShipMass;
    const directionVector = getBurnDirectionVector(ship, bodies, activeBurnDirection);
    thrustAcceleration = directionVector.scale(engineAccMagnitude);

    // Mass flow rate: dm/dt = Thrust / ExhaustVelocity
    const vE = engine.specificImpulse * STANDARD_g;
    const massFlowRate = currentThrustForce / vE; // kg/s
    fuelBurnedThisFrame = Math.min(ship.fuel, massFlowRate * dt);
  }

  // 3. Gravity — always active, dominant-body patched-conic.
  const gravityAcceleration = DominantAccel(ship.position, bodies);

  // 4. Superposition: combine engine push and gravity pull.
  const totalAcceleration = gravityAcceleration.add(thrustAcceleration);

  // 5. Semi-implicit Euler integration.
  //    (Not full velocity-Verlet here — thrust direction can change
  //    mid-burn based on live player input, so re-deriving a second
  //    acceleration sample at the new position for every frame the
  //    player might change direction adds cost without much benefit.
  //    Semi-implicit Euler is standard for player-controlled thrust and
  //    is what most arcade-precision space games use.)
  const newVelocity = ship.velocity.add(totalAcceleration.scale(dt));
  const newPosition = ship.position.add(newVelocity.scale(dt));
  const newFuel = Math.max(0, ship.fuel - fuelBurnedThisFrame);

  return {
    ship: { ...ship, position: newPosition, velocity: newVelocity, fuel: newFuel },
    t: t + dt,
  };
}

export function checkHazardCollisions(shipPos: Vector3, bodies: MovingBody[]) {
  const distFromSun = shipPos.magnitude();
  
  // 1. Asteroid belt zone check
  if (distFromSun >= 1500 && distFromSun <= 1700) {
    // Ship is inside the asteroid field! 
    // Trigger minor damage or apply random rotational turbulence vectors
  }

  // 2. Saturn Ring zone check
  const saturn = bodies.find(b => b.name === 'Saturn');
  if (saturn) {
    const distToSaturn = shipPos.distanceTo(saturn.position);
    if (distToSaturn >= 65 && distToSaturn <= 110) {
      // Ship is clipping through Saturn's rings!
      // Reduce ship speed due to particle drag friction
    }
  }
}