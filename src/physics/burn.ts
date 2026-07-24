

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


function velocityOf(body: CelestialBody): Vector3 {
  return (body as CelestialBody & { velocity?: Vector3 }).velocity ?? Vector3.zero();
}


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