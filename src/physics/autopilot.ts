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
  | 'STABLE_ORBIT'
  | 'AVOIDING';

export interface AutopilotOutput {
  direction: BurnDirection | null;
  throttle: number;
  status: AutopilotStatus;
  overrideTargetName?: string;
}


export type ThrottleMode = 'precise' | 'normal' | 'aggressive';

const THROTTLE_RESPONSE_TIME: Record<ThrottleMode, number> = {
  precise: 4.0,     // take up to ~4s to fully close the error
  normal: 1.5,
  aggressive: 0.4,  // try to close it in under half a second
};

const STABLE_VELOCITY_TOLERANCE = 3.0;


const MIN_SOI_TRANSIT_TIME = 4.0;


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
  // PHASE 0.5: OBSTACLE AVOIDANCE
  // Check if we are on a direct collision course with any body that
  // is NOT our target. If so, steer away before we crash.
  // -----------------------------------------------------------------
  for (const body of bodies) {
    if (body === target) continue;
    const bodyVel = body.velocity || Vector3.zero();
    const relVelToBody = ship.velocity.subtract(bodyVel);
    const relPosToBody = body.position.subtract(ship.position);
    const distToBody = relPosToBody.magnitude();
    const relSpeedToBody = relVelToBody.magnitude();
    
    if (relSpeedToBody === 0 || distToBody === 0) continue;

    const relVelDirToBody = relVelToBody.scale(1 / relSpeedToBody);
    const closingSpeedToBody = relVelToBody.dot(relPosToBody.normalize());

    // Only care if we are approaching it
    if (closingSpeedToBody > 0) {
      const timeToImpact = distToBody / closingSpeedToBody;
      const closingDistToBody = relPosToBody.dot(relVelDirToBody);
      const transverseToBody = relPosToBody.subtract(relVelDirToBody.scale(closingDistToBody));
      const missDistance = transverseToBody.magnitude();
      
      const safeMissDistance = body.radius * 2.5; // give some margin
      const warningTime = 15.0; // react 15 seconds before impact

      if (timeToImpact < warningTime && missDistance < safeMissDistance) {
        return { 
          direction: 'avoid', 
          throttle: 1.0, 
          status: 'AVOIDING', 
          overrideTargetName: body.name 
        };
      }
    }
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

  const orbitRadius = Math.max(distance, target.radius * 1.05);
  const circularSpeed = Math.sqrt((G * target.mass) / orbitRadius);

  const shipRelToTarget = ship.position.subtract(target.position);
  const radialDir = shipRelToTarget.magnitude() > 0
    ? shipRelToTarget.normalize()
    : new Vector3(1, 0, 0);

  const up = new Vector3(0, 1, 0);
  let baseTangentDir = shipRelToTarget.cross(up).normalize();
  if (baseTangentDir.magnitude() === 0) {
    baseTangentDir = new Vector3(0, 0, 1);
  }

  const radialComponent = relVel.dot(radialDir);
  const rawTangentialComponent = relVel.dot(baseTangentDir);
  
  const isRetrograde = rawTangentialComponent < -0.1;
  const currentTangentDir = isRetrograde ? baseTangentDir.scale(-1) : baseTangentDir;
  const currentTangentialSpeed = Math.abs(rawTangentialComponent);
  
  const tangentialError = currentTangentialSpeed - circularSpeed;
  const idealVelocity = currentTangentDir.scale(circularSpeed);
  const velocityError = relVel.subtract(idealVelocity).magnitude();

  if (velocityError < STABLE_VELOCITY_TOLERANCE) {
    return { direction: null, throttle: 0, status: 'STABLE_ORBIT' };
  }

  // Crash Prevention (Suicide Burn logic for radial descent)
  const maxAccel = engine.maxThrust / totalMass(ship);
  const stoppingDist = maxAccel > 0 ? (radialComponent * radialComponent) / (2 * maxAccel) : Infinity;
  const surfaceDist = distance - target.radius;
  const safetyMargin = target.radius * 0.5 + 20; 
  
  if (radialComponent < 0 && (surfaceDist - safetyMargin) < stoppingDist) {
    return {
      direction: 'radialOut',
      throttle: 1.0, 
      status: 'CAPTURING',
    };
  }

  // Radial mismatch dominates
  if (Math.abs(radialComponent) > Math.abs(tangentialError) &&
      Math.abs(radialComponent) > STABLE_VELOCITY_TOLERANCE) {
    return {
      direction: radialComponent > 0 ? 'radialIn' : 'radialOut',
      throttle: computeRequiredThrottle(radialComponent, ship, engine, throttleMode),
      status: 'CAPTURING',
    };
  }

  // Too fast -> retrograde sheds speed fastest
  if (relSpeed > circularSpeed * 1.05) {
    return { 
      direction: 'retrograde', 
      throttle: computeRequiredThrottle(relSpeed - circularSpeed, ship, engine, throttleMode), 
      status: 'CAPTURING' 
    };
  }

  // Tangential speed is too low -> build it
  if (tangentialError < 0) {
    return {
      direction: 'orbitTangent',
      throttle: computeRequiredThrottle(-tangentialError, ship, engine, throttleMode),
      status: 'CAPTURING',
    };
  }

  // Tangential speed is slightly too high -> trim it
  return {
    direction: 'retrograde',
    throttle: computeRequiredThrottle(tangentialError, ship, engine, throttleMode),
    status: 'CAPTURING',
  };
}