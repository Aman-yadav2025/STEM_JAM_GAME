

import { CONSTANT_DT, type Spacecraft } from './constants';
import { Vector3 } from './vector3';
import { cloneBodiesForSimulation, type MovingBody } from './orbitPath';
import { computeAutopilot, type ThrottleMode } from './autopilot';
import { updateShipPhysics } from './rocketMotion';
import type { EngineSpec } from './rocketEquation';

export interface NavigationPlan {
  path: Vector3[];
  /** True only if the simulated ship actually reached STABLE_ORBIT around the target. */
  reachable: boolean;
  stopReason?: 'ran-out-of-fuel' | 'crashed' | 'max-steps-exceeded';
}


const DEFAULT_MAX_STEPS = 50_000;


const DEFAULT_SAMPLE_EVERY = 15;

export function planNavigationRoute(
  ship: Spacecraft,
  bodies: MovingBody[],
  targetName: string,
  engine: EngineSpec,
  startTime: number,
  throttleMode: ThrottleMode = 'normal',
  maxSteps: number = DEFAULT_MAX_STEPS,
  sampleEvery: number = DEFAULT_SAMPLE_EVERY
): NavigationPlan {
  const simBodies: MovingBody[] = cloneBodiesForSimulation(bodies);

  let simShip: Spacecraft = {
    ...ship,
    position: ship.position.clone(),
    velocity: ship.velocity.clone(),
  };
  let t = startTime;

  const path: Vector3[] = [simShip.position.clone()];

  for (let i = 0; i < maxSteps; i++) {
    const auto = computeAutopilot(simShip, simBodies, targetName, engine, throttleMode);

    if (auto.status === 'STABLE_ORBIT') {
      path.push(simShip.position.clone());
      return { path, reachable: true };
    }

    if (simShip.fuel <= 0 && auto.direction !== null) {
      return { path, reachable: false, stopReason: 'ran-out-of-fuel' };
    }

    const result = updateShipPhysics(
      simShip,
      simBodies,
      engine,
      auto.direction,
      auto.throttle,
      t,
      CONSTANT_DT,
      undefined,
      targetName // resolves getBurnDirectionVector's 'intercept'/'velocityMatch' target
    );
    simShip = result.ship;
    t = result.t;

    const crashedInto = simBodies.find(
      (b) => simShip.position.distanceTo(b.position) < b.radius
    );
    if (crashedInto) {
      path.push(simShip.position.clone());
      return { path, reachable: false, stopReason: 'crashed' };
    }

    if (i % sampleEvery === 0) {
      path.push(simShip.position.clone());
    }
  }

  return { path, reachable: false, stopReason: 'max-steps-exceeded' };
}
