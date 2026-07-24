

import { Vector3 } from "./vector3";
import { type CelestialBody } from "./constants";

export interface OrbitPath {
  parentBody: CelestialBody | null; // null = doesn't orbit anything (e.g. the sun)
  orbitalRadius: number;              // distance from parent, assumed circular
  orbitalPeriod: number;                // seconds for one full revolution
  initialAngle: number;                  // starting angle at t = 0, radians
}

export type MovingBody = CelestialBody & { orbit?: OrbitPath , velocity?:Vector3};

/**
 * Computes a body's world position at simulation time `time`, given its
 * circular orbit path. Bodies with parentBody === null are treated as
 * fixed at the world origin (e.g. a central sun/star).
 */
export function bodyPositionAtTime(orbit: OrbitPath, time: number): Vector3 {
  if (orbit.parentBody === null) {
    return Vector3.zero();
  }

  // Compute angle for this time step
  const angle = orbit.initialAngle + (2 * Math.PI * time) / orbit.orbitalPeriod;
  const parentPos = orbit.parentBody.position;

  return new Vector3(
    parentPos.x + orbit.orbitalRadius * Math.cos(angle),
    parentPos.y,
    parentPos.z + orbit.orbitalRadius * Math.sin(angle)
  );
}

export function bodyVelocityAtTime(orbit: OrbitPath, time: number): Vector3 {
  if (orbit.parentBody === null) {
    return Vector3.zero();
  }

  const omega = (2 * Math.PI) / orbit.orbitalPeriod;
  const angle = orbit.initialAngle + omega * time;

  // Relative velocity vector (derivative of position with respect to time)
  const relVx = -orbit.orbitalRadius * omega * Math.sin(angle);
  const relVz = orbit.orbitalRadius * omega * Math.cos(angle);

  // Read parent's already-updated velocity
  const parentVel = (orbit.parentBody as MovingBody).velocity || Vector3.zero();

  return new Vector3(
    parentVel.x + relVx,
    parentVel.y,
    parentVel.z + relVz
  );
}

export function updateBodyPositions(bodies: MovingBody[], time: number): void {
  for (const body of bodies) {
    if (body.orbit) {
      body.position = bodyPositionAtTime(body.orbit, time);
      body.velocity = bodyVelocityAtTime(body.orbit, time);
    }else {
      // Static bodies (like the Sun) have zero velocity
      if (!body.position) body.position = Vector3.zero();
      body.velocity = Vector3.zero();
    }
  }
}

/**
 * Deep clones an array of MovingBodies and correctly re-links their orbit.parentBody
 * references to point to the cloned objects instead of the original live ones.
 */
export function cloneBodiesForSimulation(bodies: MovingBody[]): MovingBody[] {
  const clonedBodies: MovingBody[] = bodies.map((b) => ({
    ...b,
    position: b.position ? b.position.clone() : Vector3.zero(),
    velocity: b.velocity ? b.velocity.clone() : Vector3.zero(),
    orbit: b.orbit ? { ...b.orbit } : undefined,
  }));
  const clonedByName = new Map(clonedBodies.map((b) => [b.name, b]));
  for (const b of clonedBodies) {
    if (b.orbit?.parentBody) {
      b.orbit.parentBody = clonedByName.get(b.orbit.parentBody.name) ?? b.orbit.parentBody;
    }
  }
  return clonedBodies;
}
