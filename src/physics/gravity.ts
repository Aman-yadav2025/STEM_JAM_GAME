
import { G } from './constants';
import type { CelestialBody } from './constants';
import type { MovingBody } from './orbitPath';
import { Vector3 } from './vector3';

/**
 * Newtonian gravitational acceleration on a point at `position` due to `body`.
 * Direction points from position toward body.
 */
export function accelFromBody(position: Vector3, body: CelestialBody): Vector3 {
  const delta = body.position.subtract(position);
  const r = delta.magnitude();
  if (r === 0) return Vector3.zero(); // avoid divide-by-zero at the body's center

  const aMag = (G * body.mass) / (r * r);
  return delta.normalize().scale(aMag);
}

export function getDominantBody(shipPosition: Vector3, bodies: CelestialBody[]): CelestialBody {
  let dominantBody: CelestialBody | null = null;
  let smallestSOI = Infinity;

  // 1. Loop through ALL bodies, regardless of their position in the array
  for (const body of bodies) {
    const distance = shipPosition.distanceTo(body.position);

    // 2. Check if the ship is inside this body's sphere of influence
    if (distance < body.soiRadius) {
      
      // 3. We want the most specific/nested gravity well.
      // If a Planet (SOI = 200) and the Sun (SOI = Infinity) both contain the ship,
      // the Planet wins because 200 < Infinity.
      if (body.soiRadius < smallestSOI) {
        smallestSOI = body.soiRadius;
        dominantBody = body;
      }
    }
  }

  // 4. Fallback safeguard: If something goes horribly wrong, return the first body
  return dominantBody || bodies[0];
}

export function DominantAccel(position: Vector3, bodies: MovingBody[]): Vector3 {
  const dominant = getDominantBody(position, bodies) as MovingBody;
  let accel = accelFromBody(position, dominant);

  let current: MovingBody | undefined = dominant;
  while (current?.orbit?.parentBody) {
    const parent = current.orbit.parentBody as MovingBody;
    accel = accel.add(accelFromBody(current.position, parent));
    current = parent;
  }

  return accel;
}

/**
 * Full n-body sum, ignoring SOI switching. Not used by default — kept here
 * as an opt-in if you build a "three-body chaos" bonus level later.
 */
export function totalAccelNBody(position: Vector3, bodies: CelestialBody[]): Vector3 {
  let total = Vector3.zero();
  for (const body of bodies) {
    total = total.add(accelFromBody(position, body));
  }
  return total;
}