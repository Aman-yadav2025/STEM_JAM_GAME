// physics/orbitPath.ts
//
// Simple circular orbit model for moving bodies (moons orbiting planets,
// planets orbiting a sun). Deliberately NOT full Keplerian/elliptical —
// circular is easier to design levels around and easier for players to
// reason about, and matches the "assume circular for simplicity" spec.
//
// IMPORTANT ordering requirement: bodyPositionAtTime() reads
// `orbit.parentBody.position` directly off the live CelestialBody object
// (not a snapshot/copy). Since JS objects are passed by reference, this
// means: as long as updateBodyPositions() processes bodies in
// parent-before-child order, a moon will automatically see its parent
// planet's ALREADY-UPDATED position for this frame, with no extra plumbing.
// Bodies must be sorted that way when the level is set up.

import { Vector3 } from "./vector3";
import { type CelestialBody } from "./constants";

export interface OrbitPath {
  parentBody: CelestialBody | null; // null = doesn't orbit anything (e.g. the sun)
  orbitalRadius: number;              // distance from parent, assumed circular
  orbitalPeriod: number;                // seconds for one full revolution
  initialAngle: number;                  // starting angle at t = 0, radians
}

export type MovingBody = CelestialBody & { orbit?: OrbitPath };

/**
 * Computes a body's world position at simulation time `time`, given its
 * circular orbit path. Bodies with parentBody === null are treated as
 * fixed at the world origin (e.g. a central sun/star).
 */
export function bodyPositionAtTime(orbit: OrbitPath, time: number): Vector3 {
  if (orbit.parentBody === null) {
    return Vector3.zero();
  }

  const angle = orbit.initialAngle + (2 * Math.PI * time) / orbit.orbitalPeriod;
  const parentPos = orbit.parentBody.position;

  return new Vector3(
    parentPos.x + orbit.orbitalRadius * Math.cos(angle),
    parentPos.y + orbit.orbitalRadius * Math.sin(angle),
    parentPos.z
  );
}

/**
 * Updates position (mutating) for every body in the array, IN ORDER.
 * `bodies` MUST be sorted parent-before-child (e.g. [sun, planet, moon])
 * so that when a moon's position is computed, its parent planet's
 * position field has already been updated to this frame's value.
 *
 * Bodies with no `orbit` (static bodies, or the orbit's own root/sun)
 * are left untouched.
 */
export function updateBodyPositions(bodies: MovingBody[], time: number): void {
  for (const body of bodies) {
    if (body.orbit) {
      body.position = bodyPositionAtTime(body.orbit, time);
    }
  }
}
