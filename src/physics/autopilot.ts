// physics/autopilot.ts

import { Vector3 } from './vector3';
import { G, totalMass, type BurnDirection, type Spacecraft } from './constants';
import type { MovingBody } from './orbitPath';
import { DEFAULT_ENGINE, type EngineSpec } from './rocketEquation';


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

/**
 * Controls how urgently the autopilot tries to close a given velocity
 * error. This is a time constant, not a throttle cap: 'precise' spreads
 * the same Δv correction over a longer window (low, smooth throttle,
 * minimal overshoot risk — good for delicate captures), while 'aggressive'
 * tries to close it almost immediately (high throttle, fast but blunt).
 * 'normal' is a middle ground suitable as a default for most maneuvers.
 */
export type ThrottleMode = 'precise' | 'normal' | 'aggressive';

const THROTTLE_RESPONSE_TIME: Record<ThrottleMode, number> = {
  precise: 4.0,     // take up to ~4s to fully close the error
  normal: 1.5,
  aggressive: 0.4,  // try to close it in under half a second
};

const STABLE_VELOCITY_TOLERANCE = 3.0;

// BUG FIX (ship gets flung by the Sun near Mercury/Venus/Earth): the old
// cruise-phase closing speed cap (`Math.min(300, distance * 0.15)`) let the
// ship approach ANY target at up to 300 units/s regardless of how small
// that target's capture radius (SOI) actually is. Planets close to the Sun
// have small SOIs in absolute terms — strong solar tidal pull genuinely
// shrinks the physically-correct Hill sphere the closer you are to the
// Sun, this isn't a bug, it's real physics — so arriving at ~300 units/s
// could cross the whole SOI in well under a second: faster than the
// throttle-response window (`normal` mode is tuned for ~1.5s) has time to
// react. Net effect: the ship blows straight through on a hyperbolic
// flyby, exits back into deep space where the Sun is now briefly the only
// dominant body, and gets yanked hard by the Sun's very real (and, this
// close in, very strong) gravity — worse the closer the target is to the
// Sun, exactly matching the reported symptom. Fix: additionally cap the
// approach speed so the ship can't cross the target's capture radius
// faster than this many seconds, giving the CAPTURING logic genuine time
// to act before the ship can exit the SOI again.
// Give the capture logic a few seconds to react before the ship can cross
// the target's SOI. A tiny value here effectively disables the cap and
// lets the ship arrive too hot, which is exactly what causes the fly-through
// / missed-orbit behavior reported in-game.
const MIN_SOI_TRANSIT_TIME = 4.0;

/**
 * Computes the throttle (0..1) actually required to correct a velocity
 * error of magnitude `deltaV`, given the ship's CURRENT mass (dry + fuel
 * — heavier ships need more force for the same Δv) and the engine's max
 * thrust, spread over the response-time window for `mode`.
 *
 *   requiredAccel = deltaV / responseTime
 *   requiredThrust = mass * requiredAccel
 *   throttle = requiredThrust / engine.maxThrust, clamped to [0, 1]
 *
 * This replaces the old hardcoded throttle guesses (1.0, 0.5, x/20, ...)
 * with a value tied to real ship mass and real engine power — so it stays
 * correct if fuel burns down, engine specs change, or thrust gets tuned.
 */
export function computeRequiredThrottle(
  deltaV: number,
  ship: Spacecraft,
  engine: EngineSpec = DEFAULT_ENGINE,
  mode: ThrottleMode = 'normal'
): number {
  const mass = totalMass(ship);
  if (mass <= 0 || engine.maxThrust <= 0) return 0;

  const responseTime = THROTTLE_RESPONSE_TIME[mode];
  const requiredAccel = Math.abs(deltaV) / responseTime;
  const requiredThrust = mass * requiredAccel;

  return Math.min(1.0, Math.max(0, requiredThrust / engine.maxThrust));
}

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
  targetBodyName: string,
  engine: EngineSpec = DEFAULT_ENGINE,
  throttleMode: ThrottleMode = 'normal'
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
  //
  // BUG FIX (moon targeting): this used to escape currentParent
  // unconditionally whenever it wasn't exactly the target. That's wrong
  // whenever the target is itself INSIDE currentParent's SOI — e.g.
  // targeting the Moon while already in Earth orbit. Fully escaping
  // Earth in that case flies straight past the Moon's orbit and out into
  // interplanetary space instead of just cruising across Earth's SOI to
  // reach it. Now we only escape if the target is NOT already reachable
  // within the current parent's sphere of influence — otherwise we fall
  // straight through to the normal CRUISE/CAPTURE logic below, which
  // navigates directly to the target while still under the parent's
  // gravity (exactly what's needed for planet -> moon transfers).
  // -----------------------------------------------------------------
  const currentParent = findEnclosingBody(ship, bodies);
  const needsEscape =
    !!currentParent &&
    currentParent !== target &&
    target.position.subtract(currentParent.position).magnitude() >=
      captureDistanceOf(currentParent);

  if (needsEscape && currentParent) {
    const relPosCP = ship.position.subtract(currentParent.position);
    const distCP = Math.max(relPosCP.magnitude(), currentParent.radius);
    const parentVel = currentParent.velocity || Vector3.zero();
    const relVelCP = ship.velocity.subtract(parentVel);
    const speedCP = relVelCP.magnitude();

    const escapeSpeed = Math.sqrt((2 * G * currentParent.mass) / distCP);

    if (speedCP < escapeSpeed * 1.05) {
      const deltaV = escapeSpeed * 1.05 - speedCP;
      const throttle = computeRequiredThrottle(deltaV, ship, engine, throttleMode);
      return { direction: 'prograde', throttle, status: 'ESCAPING' };
    }

    // Already past escape velocity relative to the old parent — coast.
    // Next tick, once distance exceeds the old parent's SOI, findEnclosingBody
    // will stop returning it and we'll fall through to normal CRUISING logic
    // toward the real target.
    return { direction: null, throttle: 0, status: 'ESCAPING' };
  }

  // -----------------------------------------------------------------
  // From here on, ship is either in deep space, already inside the
  // target's own SOI, or navigating toward a target nested inside the
  // current parent's SOI (e.g. a moon) — original logic applies, with
  // the radial-mismatch fix and cruise-steering fix described below.
  // -----------------------------------------------------------------

  const relPos = target.position.subtract(ship.position); // ship -> target
  const distance = relPos.magnitude();
  const relPosDir = distance > 1e-6 ? relPos.scale(1 / distance) : new Vector3(1, 0, 0);

  const targetVelocity = target.velocity || Vector3.zero();
  const relVel = ship.velocity.subtract(targetVelocity);
  const relSpeed = relVel.magnitude();

  const captureDistance = captureDistanceOf(target);

  // -----------------------------------------------------------------
  // PHASE 1: CRUISING / INTERCEPT (Outside target's SOI)
  // -----------------------------------------------------------------
  if (distance > captureDistance) {
    // BUG FIX (stuck orbiting the Sun) — REVISED: the previous patch here
    // used a heuristic (choosing prograde vs retrograde based on whether
    // the ship's current heading happened to already point roughly at the
    // target) to avoid actively making a bad trajectory worse. Now that
    // burn.ts supports a real 'intercept' direction — thrust aimed
    // straight at the target's live position, independent of the ship's
    // current heading — we can steer directly instead of just guessing.
    // This is pure-pursuit guidance (aims at the target's CURRENT
    // position each tick, not a lead point ahead of it), which isn't as
    // fuel-efficient as a proper timed Hohmann transfer, but because it
    // re-aims every physics tick it reliably converges and actually
    // arrives, which a fixed prograde/retrograde burn could never
    // guarantee.
    const closingSpeed = relVel.dot(relPosDir); // + closing in, - drifting away
  const transverseVelocity = relVel.subtract(relPosDir.scale(closingSpeed));
  const transverseSpeed = transverseVelocity.magnitude();

    // Cap approach speed relative to how small the target's own capture
    // radius is, not just a flat number — see MIN_SOI_TRANSIT_TIME above.
    // Without this, a small-SOI target (any planet close to the Sun, or
    // any moon) gets approached at the same up-to-300 units/s as a huge
    // one, and gets blown through before CAPTURING logic can react.
    const maxSafeApproachSpeed = captureDistance / MIN_SOI_TRANSIT_TIME;
    const desiredClosingSpeed = Math.min(300, distance * 0.15, maxSafeApproachSpeed);
    const closingError = desiredClosingSpeed - closingSpeed;

    // If the ship still has a large sideways component relative to the target,
    // kill that first. Trying to steer straight at the target while the ship is
    // still moving across the target's path simply turns the approach into a
    // high-speed flyby and makes the later capture phase much harder.
    const maxSafeRelativeSpeed = Math.max(5, maxSafeApproachSpeed * 0.5);
    if (transverseSpeed > maxSafeRelativeSpeed + 5) {
      const throttle = computeRequiredThrottle(transverseSpeed - maxSafeRelativeSpeed, ship, engine, throttleMode);
      return { direction: 'velocityMatch', throttle, status: 'CRUISING' };
    }

    if (closingError > 5) {
      // Not closing fast enough — burn straight at the target.
      const throttle = computeRequiredThrottle(closingError, ship, engine, throttleMode);
      return { direction: 'intercept', throttle, status: 'CRUISING' };
    }

    if (closingError < -10) {
      // Closing too fast (would overshoot / arrive too hot to capture) —
      // brake along the ship's own velocity. This doesn't need to be
      // aimed precisely, it just needs to shed excess speed before the
      // capture phase takes over.
      const throttle = computeRequiredThrottle(-closingError, ship, engine, throttleMode);
      return { direction: 'retrograde', throttle, status: 'CRUISING' };
    }
    return { direction: null, throttle: 0, status: 'CRUISING' };
  }

  // -----------------------------------------------------------------
  // PHASE 2 & 3: CAPTURE & CIRCULARIZATION (Inside target's SOI)
  // -----------------------------------------------------------------

  // BUG FIX (fails to orbit the target): circularSpeed used to be computed
  // from a fixed `targetOrbitRadius = target.radius * 2.2`, but nothing
  // ever actually pushed the ship's distance toward that radius — only the
  // tangential SPEED was checked against it. Since the ship almost never
  // sits at exactly 2.2x the body's radius, `idealVelocity` was chasing a
  // speed that didn't match reality, so `velocityError` rarely dropped
  // below the stability threshold and the orbit never circularized.
  // Fix: compute circularSpeed from the ship's ACTUAL current distance —
  // clamped so it can't divide by near-zero or target an absurd speed if
  // the ship is right at/inside the surface — so the tangential target is
  // always consistent with wherever the ship actually is, and it settles
  // into a real stable orbit at that radius instead of chasing a fixed one.
  const orbitRadius = Math.max(distance, target.radius * 1.05);
  const circularSpeed = Math.sqrt((G * target.mass) / orbitRadius);

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
      throttle: computeRequiredThrottle(radialComponent, ship, engine, throttleMode),
      status: 'CAPTURING',
    };
  }

  // Too fast for a circular orbit at the current radius -> shed excess speed
  if (relSpeed > circularSpeed * 1.05) {
    const throttle = computeRequiredThrottle(relSpeed - circularSpeed, ship, engine, throttleMode);
    return { direction: 'retrograde', throttle, status: 'CAPTURING' };
  }

  // Too slow -> need to add speed, not remove it
  if (tangentialError < 0) {
    return {
      direction: 'prograde',
      throttle: computeRequiredThrottle(velocityError, ship, engine, throttleMode),
      status: 'CAPTURING',
    };
  }

  // Tangential speed slightly too high but not enough to trip the 1.05x
  // check above — trim it.
  return {
    direction: 'retrograde',
    throttle: computeRequiredThrottle(velocityError, ship, engine, throttleMode),
    status: 'CAPTURING',
  };
}