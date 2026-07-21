// physics/autopilot.ts

import { Vector3 } from './vector3';
import { G, type BurnDirection, type Spacecraft } from './constants';
import type { MovingBody } from './orbitPath';


export type AutopilotStatus =
  | 'IDLE'
  | 'CRUISING'
  | 'ESCAPING'
  | 'CAPTURING'
  | 'STABLE_ORBIT';

export interface AutopilotOutput {
  direction: BurnDirection | null;
  throttle: number;
  status: AutopilotStatus;
}

const STABLE_VELOCITY_TOLERANCE = 3.0;

function captureDistanceOf(body: MovingBody): number {
  return body.soiRadius ?? body.radius * 10;
}

/**
 * Finds the body whose sphere of influence currently contains the ship,
 * preferring the innermost (smallest-SOI) match so that a moon's SOI wins
 * over its parent planet's when both technically contain the ship.
 * Returns undefined if the ship isn't inside any body's SOI (deep space).
 */
function findEnclosingBody(
  ship: Spacecraft,
  bodies: MovingBody[]
): MovingBody | undefined {
  let best: MovingBody | undefined;
  let bestCaptureDist = Infinity;

  for (const body of bodies) {
    const captureDist = captureDistanceOf(body);
    const dist = body.position.subtract(ship.position).magnitude();
    if (dist < captureDist && captureDist < bestCaptureDist) {
      best = body;
      bestCaptureDist = captureDist;
    }
  }
  return best;
}

export function computeAutopilot(
  ship: Spacecraft,
  bodies: MovingBody[],
  targetBodyName: string
): AutopilotOutput {
  const target = bodies.find((b) => b.name === targetBodyName);
  if (!target) {
    return { direction: null, throttle: 0, status: 'IDLE' };
  }

  // -----------------------------------------------------------------
  // PHASE 0: DEPARTURE (ship is currently captured by a DIFFERENT body
  // than the requested target — e.g. still in stable orbit around the
  // old planet when the player picks a new one). Must escape that body's
  // SOI before any of the target-relative logic below means anything.
  // -----------------------------------------------------------------
  const currentParent = findEnclosingBody(ship, bodies);

  if (currentParent && currentParent !== target) {
    const relPosCP = ship.position.subtract(currentParent.position);
    const distCP = Math.max(relPosCP.magnitude(), currentParent.radius);
    const parentVel = currentParent.velocity || Vector3.zero();
    const relVelCP = ship.velocity.subtract(parentVel);
    const speedCP = relVelCP.magnitude();

    const escapeSpeed = Math.sqrt((2 * G * currentParent.mass) / distCP);

    if (speedCP < escapeSpeed * 1.05) {
      // Burn along current relative-velocity direction (prograde relative
      // to whatever we're escaping). If we're essentially stationary
      // relative to the parent, fall back to the same tangent construction
      // used for circularization so we don't burn straight at/away from it.
      return { direction: 'prograde', throttle: 1.0, status: 'ESCAPING' };
    }

    // Already past escape velocity relative to the old parent — coast.
    // Next tick, once distance exceeds the old parent's SOI, findEnclosingBody
    // will stop returning it and we'll fall through to normal CRUISING logic
    // toward the real target.
    return { direction: null, throttle: 0, status: 'ESCAPING' };
  }

  // -----------------------------------------------------------------
  // From here on, ship is either in deep space or already inside the
  // target's own SOI — original logic applies, with the radial-mismatch
  // fix from before.
  // -----------------------------------------------------------------

  const relPos = target.position.subtract(ship.position); // ship -> target
  const distance = relPos.magnitude();

  const targetVelocity = target.velocity || Vector3.zero();
  const relVel = ship.velocity.subtract(targetVelocity);
  const relSpeed = relVel.magnitude();

  const captureDistance = captureDistanceOf(target);

  // -----------------------------------------------------------------
  // PHASE 1: CRUISING / INTERCEPT (Outside target's SOI)
  // -----------------------------------------------------------------
  if (distance > captureDistance) {
    const targetSpeed = Math.min(300, distance * 0.15);
    const speedDiff = targetSpeed - relSpeed;

    if (speedDiff > 5) {
      return { direction: 'prograde', throttle: 1.0, status: 'CRUISING' };
    } else if (speedDiff < -10) {
      return { direction: 'retrograde', throttle: 0.5, status: 'CRUISING' };
    }
    return { direction: null, throttle: 0, status: 'CRUISING' };
  }

  // -----------------------------------------------------------------
  // PHASE 2 & 3: CAPTURE & CIRCULARIZATION (Inside target's SOI)
  // -----------------------------------------------------------------

  const targetOrbitRadius = target.radius * 2.2;
  const circularSpeed = Math.sqrt((G * target.mass) / targetOrbitRadius);

  // Radial direction: ship relative to target (points away from target).
  // Tangent direction: matches orbitPath.ts convention (parent->body, +90°),
  // built the same way here as (target->ship) since that IS parent->body
  // from the target's perspective.
  const shipRelToTarget = ship.position.subtract(target.position);
  const radialDir = shipRelToTarget.magnitude() > 0
    ? shipRelToTarget.normalize()
    : new Vector3(1, 0, 0);

  const up = new Vector3(0, 1, 0);
  let tangentDir = shipRelToTarget.cross(up).normalize();
  if (tangentDir.magnitude() === 0) {
    tangentDir = new Vector3(0, 0, 1);
  }

  // Decompose the ship's relative velocity into radial and tangential
  // components against that basis, rather than just diffing against a
  // single idealVelocity vector — this is what lets us tell "too fast/slow"
  // apart from "falling in/flying out" and choose the right burn.
  const radialComponent = relVel.dot(radialDir);
  const tangentialComponent = relVel.dot(tangentDir);
  const tangentialError = tangentialComponent - circularSpeed;

  const idealVelocity = tangentDir.scale(circularSpeed);
  const velocityError = relVel.subtract(idealVelocity).magnitude();

  // Stable circular orbit achieved!
  if (velocityError < STABLE_VELOCITY_TOLERANCE) {
    return { direction: null, throttle: 0, status: 'STABLE_ORBIT' };
  }

  // Radial mismatch dominates: ship is drifting toward/away from the body
  // faster than its tangential speed is off. A prograde/retrograde burn
  // can't fix this — only a radial burn can.
  if (Math.abs(radialComponent) > Math.abs(tangentialError) &&
      Math.abs(radialComponent) > STABLE_VELOCITY_TOLERANCE) {
    const direction: BurnDirection =
      radialComponent > 0 ? 'radialIn' : 'radialOut'; // moving out -> burn in, and vice versa
    return {
      direction,
      throttle: Math.min(1.0, Math.abs(radialComponent) / 20),
      status: 'CAPTURING',
    };
  }

  // Too fast for a circular orbit at the target radius -> shed excess speed
  if (relSpeed > circularSpeed * 1.05) {
    return { direction: 'retrograde', throttle: 1.0, status: 'CAPTURING' };
  }

  // Too slow -> need to add speed, not remove it
  if (tangentialError < 0) {
    return {
      direction: 'prograde',
      throttle: Math.min(1.0, velocityError / 20),
      status: 'CAPTURING',
    };
  }

  // Tangential speed slightly too high but not enough to trip the 1.05x
  // check above — trim it.
  return {
    direction: 'retrograde',
    throttle: Math.min(1.0, velocityError / 20),
    status: 'CAPTURING',
  };
}