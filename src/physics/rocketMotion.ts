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
//
// INTEGRATION SCHEME: velocity Verlet, not semi-implicit Euler.
//
// This used to be semi-implicit Euler. That's normally fine for orbital
// mechanics because it's symplectic (energy stays bounded rather than
// drifting) - BUT that guarantee only strictly holds for an AUTONOMOUS
// system, i.e. one where the force field doesn't itself change with time.
// Here it does: the body the ship is orbiting (e.g. Earth) is itself
// moving every tick along its own solar orbit, so the force field the ship
// feels is explicitly time-dependent. Under Euler, that non-autonomy let
// small per-step errors slowly random-walk the ship's orbital energy
// upward over thousands of ticks - stable for a while, then a slow drift
// into an unbound trajectory that looks like a sudden "escape" once the
// ship crosses the dominant body's SOI boundary. trajectoryPredictor.ts
// already made this same argument for using Verlet over Euler for its
// coast predictions; the same argument applies here during any tick where
// thrust direction isn't actively changing (which is every tick - thrust,
// if any, is fixed in direction for the duration of one fixed timestep).

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
  t: number,
  dt: number = CONSTANT_DT
): RocketMotionResult {
  const stepDt = dt;

  // 1. Move celestial bodies to their position at time t first — gravity
  //    this frame must be evaluated against where planets/moons ARE now,
  //    not a stale position from last frame.
  updateBodyPositions(bodies, t);

  // 2. Engine thrust (if the player is actively burning and has fuel).
  //    Direction/magnitude are treated as constant across this one fixed
  //    timestep (the player's input can only change between ticks, not
  //    mid-tick), which is what makes it safe to fold into a Verlet step
  //    the same way a constant external force would be.
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
    fuelBurnedThisFrame = Math.min(ship.fuel, massFlowRate * stepDt);
  }

  // 3. Gravity sample at the START position — dominant-body patched-conic.
  const a0Gravity = DominantAccel(ship.position, bodies);

  // 4. Velocity Verlet position update:
  //    x1 = x0 + v0*dt + 0.5*a0*dt^2
  //    Thrust is constant for the step, so it folds into the same
  //    "constant acceleration this step" term as gravity's first sample.
  const a0Total = a0Gravity.add(thrustAcceleration);
  const newPosition = ship.position
    .add(ship.velocity.scale(stepDt))
    .add(a0Total.scale(0.5 * stepDt * stepDt));

  // 5. Second gravity sample, at the NEW position. Bodies are already at
  //    time t (only the ship moves within a single tick), so no second
  //    updateBodyPositions call is needed here.
  const a1Gravity = DominantAccel(newPosition, bodies);
  const a1Total = a1Gravity.add(thrustAcceleration);

  // 6. Velocity Verlet velocity update — average of both acceleration
  //    samples. This averaging is what keeps the integration bounded
  //    (no long-term energy drift) even though the body being orbited is
  //    itself moving every tick.
  const newVelocity = ship.velocity.add(a0Total.add(a1Total).scale(0.5 * stepDt));

  const newFuel = Math.max(0, ship.fuel - fuelBurnedThisFrame);

  return {
    ship: { ...ship, position: newPosition, velocity: newVelocity, fuel: newFuel },
    t: t + stepDt,
  };
}

export function checkHazardCollisions(shipPos: Vector3, bodies: MovingBody[]) {
  const distFromSun = shipPos.magnitude();

  // 1. Asteroid belt zone check
  if (distFromSun >= 1500 && distFromSun <= 1700) {
    // Ship is inside the asteroid field!
    // Trigger minor damage or apply random rotational turbulence vectors.
  }

  // 2. Saturn ring zone check
  const saturn = bodies.find((b) => b.name === 'Saturn');
  if (saturn) {
    const distToSaturn = shipPos.distanceTo(saturn.position);
    if (distToSaturn >= 65 && distToSaturn <= 110) {
      // Ship is clipping through Saturn's rings!
      // Reduce ship speed due to particle drag friction.
    }
  }
}