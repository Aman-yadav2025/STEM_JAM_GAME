// physics/navigationPlanner.ts
//
// Plans the route to a chosen destination — as a PREVIEW, not a control
// mechanism. It doesn't fly the ship anywhere; it forward-simulates a
// throwaway COPY of the ship and bodies, feeding computeAutopilot()'s
// output into the same updateShipPhysics() integrator the live game uses
// each frame, and records the resulting path.
//
// Why not trajectoryPredictor.ts: that module is a pure gravity-only coast
// (no thrust at all) — it can answer "where does the ship drift if it stops
// burning right now", but it has no notion of a destination and can't
// represent the escape/cruise/capture/circularize burns actually needed to
// reach one. This module answers a different question: "if the autopilot
// were flying to X, what path would it take?" — which is exactly what a
// route-preview line needs to show, independent of whether autopilot is
// actually engaged.
//
// NOT intended to run every frame like TrajectoryLine's coast preview — a
// full interplanetary transfer can be many thousands of physics ticks.
// Call this once when a destination is chosen (see store.ts's
// setNavigationTarget) and cache the result; expose refreshNavigationRoute()
// for callers that want to recompute later (e.g. after a manual maneuver
// takes the ship off the previously-planned route).

// import { CONSTANT_DT, type Spacecraft } from './constants';
// import { Vector3 } from './vector3';
// import { cloneBodiesForSimulation, type MovingBody } from './orbitPath';
// import { computeAutopilot, type ThrottleMode } from './autopilot';
// import { updateShipPhysics } from './rocketMotion';
// import type { EngineSpec } from './rocketEquation';

// export interface NavigationPlan {
//   path: Vector3[];
//   /** True only if the simulated ship actually reached STABLE_ORBIT around the target. */
//   reachable: boolean;
//   /** Why the simulation stopped short of the destination, if it did. */
//   stopReason?: 'ran-out-of-fuel' | 'crashed' | 'max-steps-exceeded';
// }

// // ~7 minutes of simulated time at CONSTANT_DT — generous enough for any
// // transfer this system's bodies realistically require (see the timing
// // discussion in autopilot.ts/rocketEquation.ts for the tuning this assumes),
// // while still bounding worst-case compute if a target is unreachable.
// const DEFAULT_MAX_STEPS = 50_000;

// // Recording every single physics tick would make the path array (and the
// // rendered line) enormous for a long cruise. Sampling every N ticks keeps
// // it a sane size without losing the shape of the route.
// const DEFAULT_SAMPLE_EVERY = 15;

// export function planNavigationRoute(
//   ship: Spacecraft,
//   bodies: MovingBody[],
//   targetName: string,
//   engine: EngineSpec,
//   startTime: number,
//   throttleMode: ThrottleMode = 'normal',
//   maxSteps: number = DEFAULT_MAX_STEPS,
//   sampleEvery: number = DEFAULT_SAMPLE_EVERY
// ): NavigationPlan {
//   const simBodies: MovingBody[] = cloneBodiesForSimulation(bodies);

//   let simShip: Spacecraft = {
//     ...ship,
//     position: ship.position.clone(),
//     velocity: ship.velocity.clone(),
//   };
//   let t = startTime;

//   const path: Vector3[] = [simShip.position.clone()];

//   for (let i = 0; i < maxSteps; i++) {
//     const auto = computeAutopilot(simShip, simBodies, targetName, engine, throttleMode);

//     if (auto.status === 'STABLE_ORBIT') {
//       path.push(simShip.position.clone());
//       return { path, reachable: true };
//     }

//     if (simShip.fuel <= 0 && auto.direction !== null) {
//       // Autopilot still wants to burn but the tank is empty — it'll just
//       // coast from here, which trajectoryPredictor.ts already covers.
//       // Stop the plan here rather than spinning through the remaining
//       // step budget doing nothing.
//       return { path, reachable: false, stopReason: 'ran-out-of-fuel' };
//     }

//     const result = updateShipPhysics(
//       simShip,
//       simBodies,
//       engine,
//       auto.direction,
//       auto.throttle,
//       t,
//       CONSTANT_DT,
//       undefined,
//       targetName // resolves getBurnDirectionVector's 'intercept'/'velocityMatch' target
//     );
//     simShip = result.ship;
//     t = result.t;

//     const crashedInto = simBodies.find(
//       (b) => simShip.position.distanceTo(b.position) < b.radius
//     );
//     if (crashedInto) {
//       path.push(simShip.position.clone());
//       return { path, reachable: false, stopReason: 'crashed' };
//     }

//     if (i % sampleEvery === 0) {
//       path.push(simShip.position.clone());
//     }
//   }

//   return { path, reachable: false, stopReason: 'max-steps-exceeded' };
// }
