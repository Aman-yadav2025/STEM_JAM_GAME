// physics/burn.ts
//
// Two things live here:
//
// 1. getBurnDirectionVector() — shared by BOTH burn styles (instant and
//    continuous). Prograde/retrograde are relative to the ship's own
//    velocity. Radial in/out are relative to the DOMINANT BODY's position
//    (the true physical definition — the line connecting ship and central
//    body), not just "perpendicular to velocity". Those only coincide for a
//    perfectly circular orbit; for anything elliptical they diverge, so
//    this needs `bodies` to look up the current dominant body.
//
// 2. applyBurn()/previewBurn() — INSTANT delta-v burns via the rocket
//    equation. NOT the primary player-facing mechanism anymore (see
//    rocketMotion.ts for the continuous-thrust primary integrator) — kept
//    for scripted/NPC burns or a future "auto-circularize" button.

import type { BurnDirection, Spacecraft, CelestialBody } from './constants';
import { totalMass } from './constants';
import { getDominantBody } from './gravity';
import type { EngineSpec } from './Rocketequation';
import { DEFAULT_ENGINE, propellantForDeltaV, maxDeltaVForPropellant } from './rocketEquation';
import { Vector3 } from './vector3';

export interface BurnResult {
  success: boolean;
  reason?: string;
  propellantUsed?: number;
}

/**
 * Unit vector for a given burn direction. Prograde/retrograde use the
 * ship's own velocity; radial in/out use the line to the current dominant
 * body, which is the physically correct definition of "radial".
 */
export function getBurnDirectionVector(
  ship: Spacecraft,
  bodies: CelestialBody[],
  direction: BurnDirection
): Vector3 {



  switch (direction) {
    case 'prograde':
      return ship.velocity.normalize();
    case 'retrograde':
      return ship.velocity.normalize().scale(-1);
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
      const angularMomentum = relativePosition.cross(ship.velocity);

      // Degenerate case: purely radial velocity (falling straight in/out,
      // or sitting at periapsis/apoapsis of a zero-angular-momentum path)
      // means there's no well-defined orbital plane to be normal to.
      if (angularMomentum.magnitude() < 1e-9) {
        return Vector3.zero();
      }

      const normalUnit = angularMomentum.normalize();
      return direction === 'normal' ? normalUnit : normalUnit.scale(-1);
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
  engine: EngineSpec = DEFAULT_ENGINE
): BurnResult & { ship: Spacecraft } {
  const speed = ship.velocity.magnitude();
  if (speed === 0 && direction !== 'radialIn' && direction !== 'radialOut') {
    return { success: false, reason: 'cannot determine prograde direction at zero velocity', ship };
  }

  const massBefore = totalMass(ship);
  const propellantNeeded = propellantForDeltaV(deltaV, massBefore, engine);

  if (propellantNeeded > ship.fuel) {
    return { success: false, reason: 'insufficient fuel', ship };
  }

  const burnUnit = getBurnDirectionVector(ship, bodies, direction);
  if (burnUnit.magnitude() === 0) {
    return { success: false, reason: 'cannot determine burn direction (no orbital plane defined)', ship };
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
  engine: EngineSpec = DEFAULT_ENGINE
) {
  const massBefore = totalMass(ship);
  const propellantNeeded = propellantForDeltaV(deltaV, massBefore, engine);
  const burnUnit = getBurnDirectionVector(ship, bodies, direction);
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
