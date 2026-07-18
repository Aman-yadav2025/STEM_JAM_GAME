import { CONSTANT_DT, type CelestialBody, type Spacecraft } from "./constants"
import { Vector3 } from "./vector3"
import { totalAcceleration } from "./gravity";

const dt = CONSTANT_DT;

export function step(ship: Spacecraft, bodies: CelestialBody[]) {
    const a0 = totalAcceleration(ship, bodies);

    ship.position = ship.position
        .add(ship.velocity.scale(dt))
        .add(a0.scale(0.5 * dt * dt));

    const a1 = totalAcceleration(ship, bodies);

    ship.velocity = ship.velocity.add(a0.add(a1).scale(0.5 * dt));
}

/**
 * Pure, non-mutating step used by the UI trajectory line projector.
 * Accepts raw vectors and returns new instances.
 */
export function stepState(
  position: Vector3,
  velocity: Vector3,
  bodies: CelestialBody[],
): { position: Vector3; velocity: Vector3 } {
  
  // Mock a temporary spacecraft interface to pass to your existing acceleration function
  const mockShip = { position: position.clone(), velocity: velocity.clone() };
  
  // Standard Semi-Implicit Euler is perfectly fine here to save CPU cycles during deep projections
  const acceleration = totalAcceleration(mockShip as any, bodies);

  const nextVelocity = velocity.add(acceleration.scale(dt));
  const nextPosition = position.add(nextVelocity.scale(dt));

  return {
    position: nextPosition,
    velocity: nextVelocity
  };
}