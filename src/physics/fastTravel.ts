import { Vector3 } from './vector3';
import { G, type Spacecraft } from './constants';
import type { MovingBody } from './orbitPath';

/**
 * Calculates the new position and velocity required to place a spacecraft
 * into a stable circular orbit around the target body.
 */
export function calculateFastTravelState(
  ship: Spacecraft,
  target: MovingBody
): Partial<Spacecraft> {
  // 1. Calculate safe orbit altitude and radius.
  //
  // The altitude floor below is sized for PLANETS, where SOI radius is huge
  // relative to the body's own radius. Moons don't have that luxury — their
  // SOI (Hill sphere) can be barely bigger than the moon itself. If we used
  // `target.radius + orbitAltitude` unclamped, a small moon could get an
  // orbit radius that lands the ship OUTSIDE its own SOI, so
  // getDominantBody() would hand the ship right back to the parent planet
  // instead of the moon we just "orbited" — the ship silently isn't
  // orbiting the thing fast-travel says it is.
  //
  // Fix: clamp the orbit radius to a safe fraction of the target's actual
  // soiRadius (80%, leaving margin so numerical drift over time doesn't
  // immediately kick the ship out of the SOI), whichever is smaller.
  const desiredAltitude = Math.max(15, target.radius * 0.5);
  const desiredOrbitRadius = target.radius + desiredAltitude;
  const maxSafeOrbitRadius = target.soiRadius * 0.8;
  const orbitRadius = Math.min(desiredOrbitRadius, maxSafeOrbitRadius);

  // 2. Position ship offset along +X axis relative to the target
  const relativePosition = new Vector3(orbitRadius, 0, 0);
  const newPosition = target.position.add(relativePosition);

  // 3. Calculate circular orbital speed: v = sqrt(G * M / r)
  const circularSpeed = Math.sqrt((G * target.mass) / orbitRadius);

  // 4. Tangential relative velocity (+Z direction in the XZ plane)
  const relativeVelocity = new Vector3(0, 0, circularSpeed);

  // 5. Combine target body's velocity with the ship's relative orbital velocity
  const targetVelocity = target.velocity || Vector3.zero();
  const newVelocity = targetVelocity.add(relativeVelocity);

  return {
    position: newPosition,
    velocity: newVelocity,
    heading: Math.atan2(newVelocity.z, newVelocity.x),
  };
}