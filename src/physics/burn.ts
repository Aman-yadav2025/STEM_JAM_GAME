// physics/burn.ts
//
// Two things live here:
//
// 1. getBurnDirectionVector() — shared by BOTH burn styles (instant and
//    continuous). Prograde/retrograde/normal/antinormal are relative to
//    the ship's velocity RELATIVE TO THE CURRENT DOMINANT BODY — not the
//    ship's raw inertial/heliocentric velocity. Radial in/out are relative
//    to the DOMINANT BODY's position (the true physical definition — the
//    line connecting ship and central body), not just "perpendicular to
//    velocity". Those only coincide for a perfectly circular orbit; for
//    anything elliptical they diverge, so this needs `bodies` to look up
//    the current dominant body.
//
//    BUG FIX (orbit insertion around anything but the Sun): prograde and
//    retrograde used to be `ship.velocity.normalize()` — the ship's
//    absolute/inertial velocity. That's only physically meaningful when
//    the body you're orbiting is itself stationary. Every planet moves
//    around the Sun, and every moon moves around its planet, so a ship's
//    absolute velocity is really "orbital velocity around the dominant
//    body" PLUS "the dominant body's own velocity around whatever IT
//    orbits" (and for moons, plus the grandparent's velocity too). Firing
//    'retrograde' against the ship's raw velocity mostly cancels the
//    dominant body's own (large) orbital motion instead of the ship's
//    (small) relative motion around it — the error this was supposed to
//    correct barely shrinks, or gets corrected in the wrong plane
//    entirely. This was survivable near the Sun (planets there have large
//    local circular speeds relative to the mismatch), got progressively
//    worse for slower/lower-mass bodies (Mars — never converges), turned
//    violent for massive ones (Saturn/Uranus — badly-aimed impulses next
//    to strong gravity produce chaotic, destabilizing trajectories), and
//    failed outright for every moon (whose own orbital velocity is
//    swamped by its planet's — and the planet's by the Sun's — inertial
//    velocity). Fix: subtract the dominant body's own velocity first, so
//    "prograde" always means "prograde relative to whatever you're
//    actually orbiting," matching the frame autopilot.ts's error
//    calculations were already using.
//
//    'intercept' is new: unlike every other direction, it isn't derived
//    from the ship's own state at all — it points straight at an
//    ARBITRARY target body's current position, passed in via
//    `interceptTarget`. This is what lets the autopilot actually STEER
//    during interplanetary cruise instead of only being able to speed up
//    or slow down along whatever heading it already happens to have.
//    Manual/player flight never uses this (there's no player-facing way to
//    designate an interceptTarget), so existing controls are unaffected.
//
// 2. applyBurn()/previewBurn() — INSTANT delta-v burns via the rocket
//    equation. NOT the primary player-facing mechanism anymore (see
//    rocketMotion.ts for the continuous-thrust primary integrator) — kept
//    for scripted/NPC burns or a future "auto-circularize" button.

import type { BurnDirection, Spacecraft, CelestialBody } from './constants';
import { totalMass } from './constants';
import { getDominantBody } from './gravity';
import type { EngineSpec } from './rocketEquation';
import { DEFAULT_ENGINE, propellantForDeltaV, maxDeltaVForPropellant } from './rocketEquation';
import { Vector3 } from './vector3';

export interface BurnResult {
  success: boolean;
  reason?: string;
  propellantUsed?: number;
}

/** Bodies at runtime always carry a velocity (see MovingBody in orbitPath.ts);
 * CelestialBody itself doesn't declare the field, so this narrows it back in
 * without requiring every caller to import/pass MovingBody explicitly. */
function velocityOf(body: CelestialBody): Vector3 {
  return (body as CelestialBody & { velocity?: Vector3 }).velocity ?? Vector3.zero();
}

/**
 * Unit vector for a given burn direction. Prograde/retrograde/normal/
 * antinormal use the ship's velocity RELATIVE TO THE CURRENT DOMINANT
 * BODY (see bug-fix note above) — not the ship's raw inertial velocity.
 * Radial in/out use the line to the current dominant body, which is the
 * physically correct definition of "radial". 'intercept' points straight
 * at `interceptTarget`'s current position, regardless of the ship's own
 * velocity or which body dominates its local gravity — required for
 * `interceptTarget` to be supplied, otherwise degenerates to a zero
 * vector (no thrust) rather than throwing, so a caller that forgets to
 * pass a target just coasts instead of crashing.
 */
export function getBurnDirectionVector(
  ship: Spacecraft,
  bodies: CelestialBody[],
  direction: BurnDirection,
  interceptTarget?: CelestialBody | null
): Vector3 {



  switch (direction) {
    case 'prograde':
    case 'retrograde': {
      const body = getDominantBody(ship.position, bodies);
      const relativeVelocity = ship.velocity.subtract(velocityOf(body));
      const relSpeed = relativeVelocity.magnitude();
      if (relSpeed === 0) return Vector3.zero();
      const unit = relativeVelocity.scale(1 / relSpeed);
      return direction === 'prograde' ? unit : unit.scale(-1);
    }
    case 'radialOut': {
      const body = getDominantBody(ship.position, bodies);
      return ship.position.subtract(body.position).normalize();
    }
    case 'radialIn': {
      const body = getDominantBody(ship.position, bodies);
      return body.position.subtract(ship.position).normalize();
    }
    case 'normal':
    case 'antinormal': {
      const body = getDominantBody(ship.position, bodies);
      const relativePosition = ship.position.subtract(body.position);
      const relativeVelocity = ship.velocity.subtract(velocityOf(body));
      const angularMomentum = relativePosition.cross(relativeVelocity);

      // Degenerate case: purely radial velocity (falling straight in/out,
      // or sitting at periapsis/apoapsis of a zero-angular-momentum path)
      // means there's no well-defined orbital plane to be normal to.
      if (angularMomentum.magnitude() < 1e-9) {
        return Vector3.zero();
      }

      const normalUnit = angularMomentum.normalize();
      return direction === 'normal' ? normalUnit : normalUnit.scale(-1);
    }
    case 'intercept': {
      if (!interceptTarget) {
        return Vector3.zero();
      }
      const toTarget = interceptTarget.position.subtract(ship.position);
      return toTarget.magnitude() > 0 ? toTarget.normalize() : Vector3.zero();
    }
    case 'velocityMatch': {
      if (!interceptTarget) {
        return Vector3.zero();
      }
      const targetVelocity = velocityOf(interceptTarget);
      const relativeVelocity = ship.velocity.subtract(targetVelocity);
      const relSpeed = relativeVelocity.magnitude();
      return relSpeed > 0 ? relativeVelocity.scale(-1 / relSpeed) : Vector3.zero();
    }
    case 'avoid': {
      if (!interceptTarget) {
        return Vector3.zero();
      }
      const toTarget = interceptTarget.position.subtract(ship.position);
      const targetVel = velocityOf(interceptTarget);
      const relVel = ship.velocity.subtract(targetVel);
      const relSpeed = relVel.magnitude();
      if (relSpeed === 0) {
        return toTarget.normalize().scale(-1);
      }
      const relVelDir = relVel.scale(1 / relSpeed);
      const closingDist = toTarget.dot(relVelDir);
      const transverse = toTarget.subtract(relVelDir.scale(closingDist));
      if (transverse.magnitude() > 1e-6) {
        // Thrust in opposite direction of target's relative transverse position
        return transverse.normalize().scale(-1);
      } else {
        // Heading dead center, thrust perpendicular
        const arbitraryPerp = relVelDir.cross(new Vector3(0, 1, 0));
        if (arbitraryPerp.magnitude() < 1e-6) {
          return relVelDir.cross(new Vector3(1, 0, 0)).normalize();
        }
        return arbitraryPerp.normalize();
      }
    }
    case 'orbitTangent': {
      const body = interceptTarget || getDominantBody(ship.position, bodies);
      const relPos = ship.position.subtract(body.position);
      const radialOut = relPos.magnitude() > 0 ? relPos.normalize() : new Vector3(1, 0, 0);
      const up = new Vector3(0, 1, 0);
      let tangent = radialOut.cross(up).normalize();
      if (tangent.magnitude() === 0) {
        tangent = new Vector3(0, 0, 1);
      }
      
      const relVel = ship.velocity.subtract(velocityOf(body));
      if (relVel.dot(tangent) < -0.1) {
        return tangent.scale(-1);
      }
      return tangent;
    }
  }
}

/**
 * Applies an instantaneous delta-v burn to the ship, via the rocket
 * equation. Returns a NEW Spacecraft object rather than mutating — keep
 * this pattern everywhere so state updates stay predictable.
 */
export function applyBurn(
  ship: Spacecraft,
  bodies: CelestialBody[],
  direction: BurnDirection,
  deltaV: number,
  engine: EngineSpec = DEFAULT_ENGINE,
  interceptTarget?: CelestialBody | null
): BurnResult & { ship: Spacecraft } {
  if (direction === 'prograde' || direction === 'retrograde' || direction === 'normal' || direction === 'antinormal') {
    const body = getDominantBody(ship.position, bodies);
    const relSpeed = ship.velocity.subtract(velocityOf(body)).magnitude();
    if (relSpeed === 0) {
      return { success: false, reason: 'cannot determine burn direction at zero velocity relative to dominant body', ship };
    }
  }

  const massBefore = totalMass(ship);
  const propellantNeeded = propellantForDeltaV(deltaV, massBefore, engine);

  if (propellantNeeded > ship.fuel) {
    return { success: false, reason: 'insufficient fuel', ship };
  }

  const burnUnit = getBurnDirectionVector(ship, bodies, direction, interceptTarget);
  if (burnUnit.magnitude() === 0) {
    return { success: false, reason: 'cannot determine burn direction (no orbital plane defined, or no intercept target given)', ship };
  }


  const updatedShip: Spacecraft = {
    ...ship,
    velocity: ship.velocity.add(burnUnit.scale(deltaV)),
    fuel: ship.fuel - propellantNeeded,
  };

  return { success: true, propellantUsed: propellantNeeded, ship: updatedShip };
}

/** Non-mutating preview — same math as applyBurn, without spending fuel. */
export function previewBurn(
  ship: Spacecraft,
  bodies: CelestialBody[],
  direction: BurnDirection,
  deltaV: number,
  engine: EngineSpec = DEFAULT_ENGINE,
  interceptTarget?: CelestialBody | null
) {
  const massBefore = totalMass(ship);
  const propellantNeeded = propellantForDeltaV(deltaV, massBefore, engine);
  const burnUnit = getBurnDirectionVector(ship, bodies, direction, interceptTarget);
  const velocity = ship.velocity.add(burnUnit.scale(deltaV));

  return {
    velocity,
    propellantUsed: propellantNeeded,
    affordable: propellantNeeded <= ship.fuel,
  };
}

/** Maximum Δv the ship could still achieve with its remaining fuel. */
export function maxAvailableDeltaV(
  ship: Spacecraft,
  engine: EngineSpec = DEFAULT_ENGINE
): number {
  const massBefore = totalMass(ship);
  return maxDeltaVForPropellant(ship.fuel, massBefore, engine);
}