// physics/gravity.ts
//
// Pure Newtonian gravity (F = G*M*m/r², a = G*M/r²). No relativistic
// corrections — at this scale (ordinary planet/moon masses, sub-relativistic
// velocities, minutes-long play sessions) relativistic effects are not just
// negligible but undetectable in principle.
//
// For multi-body levels (gravity assist, Lagrange), we use the "patched
// conic" approximation: the ship is under the gravitational influence of
// exactly ONE body at a time — whichever body's sphere of influence (SOI)
// it currently occupies. This is what real mission planners use for a
// reason: it's simpler, numerically stable, and predictable for players,
// unlike full n-body simulation which is chaotic and hard to reason about.

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

/**
 * Determines which body's sphere of influence the ship currently occupies.
 * Bodies should be ordered from smallest-to-largest SOI (moon before planet)
 * so the ship is assigned to the most locally dominant body when SOIs overlap.
 * Falls back to the first body in the array (treated as primary) if the ship
 * is outside every defined SOI.
 */
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
/**
 * Total acceleration on the ship, using patched-conic dominant-body gravity.
 * This is the function every integrator (rocketMotion, trajectoryPredictor)
 * should call for gravity.
 *
 * BUG FIX: this used to add `accelFromBody(dominant.position, bodies[0])`
 * whenever `dominant.name !== 'sun'` — i.e. it assumed the dominant body's
 * parent was ALWAYS the Sun (bodies[0]). That's true for planets, but false
 * for moons — a moon's parent is its planet, not the Sun. So a ship
 * captured by, say, the Moon was getting the Sun's (much weaker,
 * wrong-direction) pull added instead of Earth's — the actual force that
 * curves the Moon's own path — which corrupted orbital dynamics for any
 * ship near a moon and made stable capture there effectively impossible.
 * Fix: walk the REAL parent chain (moon -> planet -> sun, however deep),
 * adding each ancestor's pull on the previous body's position, so the
 * reference frame is correct at every level of nesting, not just one.
 */
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