// physics/trajectoryPredictor.ts
//
// Forward-simulates the ship's future COASTING path (gravity only, no
// thrust) — this is what draws the live trajectory line, and doubles as
// the "burn preview" by being re-run each frame off the ship's current
// (possibly mid-burn) velocity.
//
// Uses VELOCITY VERLET here, not the semi-implicit Euler used in
// rocketMotion.ts. Why the difference: rocketMotion integrates the LIVE
// ship, where player-controlled thrust can change direction mid-step, so a
// second acceleration sample at the step's end isn't reliably knowable —
// Euler is the right tool there. This predictor is pure coast, no player
// input mid-prediction, so there's no reason to accept Euler's worse energy
// conservation — Verlet is strictly better here and the lookahead can run
// hundreds of steps, where Euler's error visibly compounds.

import { CONSTANT_DT } from './constants';
import { Vector3 } from './vector3';
import { DominantAccel } from './gravity';
import { updateBodyPositions, type MovingBody } from './orbitPath';
import { G } from './constants';
import { getDominantBody } from './gravity';

/**
 * Number of physics ticks needed to complete exactly one orbit, based on
 * the ship's CURRENT velocity (i.e. what its orbit would be if it stopped
 * thrusting right now). Returns `maxSteps` for unbound (parabolic/
 * hyperbolic) trajectories, since those have no finite period.
 */
export function estimateOrbitSteps(
  position: Vector3,
  velocity: Vector3,
  bodies: MovingBody[],
  maxSteps: number,
  minSteps: number = 50
): number {
  const body = getDominantBody(position, bodies);
  const r = position.distanceTo(body.position);
  const v2 = velocity.lengthsq();
  const mu = G * body.mass;

  const specificEnergy = v2 / 2 - mu / r;

  if (specificEnergy >= 0) {
    // Unbound — no closed orbit to complete, show as much as the buffer allows.
    return maxSteps;
  }

  const semiMajorAxis = -mu / (2 * specificEnergy);
  const period = 2 * Math.PI * Math.sqrt(semiMajorAxis ** 3 / mu);
  const steps = Math.ceil(period / CONSTANT_DT);

  return Math.min(maxSteps, Math.max(minSteps, steps));
}


export function predictPath(
  startPosition: Vector3,
  startVelocity: Vector3,
  bodies: MovingBody[],
  steps: number,
  startTime: number
): Vector3[] {
  const dt = CONSTANT_DT;

  // Clone every body (with its own cloned position) so prediction never
  // mutates live game state. Critically, also remap each clone's
  // `orbit.parentBody` to point at its SIBLING inside this cloned array,
  // not the original live body. updateBodyPositions() only advances
  // objects that are actually IN the array it's given — if a moon's
  // parentBody still pointed at the original live planet, the finite-
  // difference velocity probe below would read that live planet's frozen,
  // un-shifted position at every probe time, so the planet's own orbital
  // velocity around the sun would never show up in the moon's computed
  // "dominant body velocity" — only the moon's own spin around a
  // stationary point. That's what was making trajectories drawn around a
  // moon balloon out to solar-orbit scale.
  const predictedBodies: MovingBody[] = bodies.map((b) => ({
    ...b,
    position: b.position.clone(),
    orbit: b.orbit ? { ...b.orbit } : undefined,
  }));
  const clonedByName = new Map(predictedBodies.map((b) => [b.name, b]));
  for (const b of predictedBodies) {
    if (b.orbit?.parentBody) {
      b.orbit.parentBody = clonedByName.get(b.orbit.parentBody.name) ?? b.orbit.parentBody;
    }
  }

  // 1. Identify the dominant body exactly at the start time
  updateBodyPositions(predictedBodies, startTime);
  const dominantBody = getDominantBody(startPosition, predictedBodies);
  const dominantStartPos = dominantBody.position.clone();

  // 2. Calculate the dominant body's global velocity via finite difference
  // (Since the planets are "on rails", we sample slightly before and after)
  const epsilonDt = 0.01;
  updateBodyPositions(predictedBodies, startTime - epsilonDt);
  const posMinus = dominantBody.position.clone();
  updateBodyPositions(predictedBodies, startTime + epsilonDt);
  const posPlus = dominantBody.position.clone();
  const dominantVelocity = posPlus.subtract(posMinus).scale(1 / (2 * epsilonDt));

  // 3. Shift Ship to Local Space (relative to the dominant body)
  let relPosition = startPosition.subtract(dominantStartPos);
  let relVelocity = startVelocity.subtract(dominantVelocity);

  const path: Vector3[] = [startPosition.clone()];
  const mu = G * dominantBody.mass;

  // Helper: Gravity in pure local space (pulling toward origin)
  function getLocalGravity(pos: Vector3): Vector3 {
    const rSq = pos.lengthsq();
    if (rSq === 0) return Vector3.zero();
    const aMag = mu / rSq;
    return pos.normalize().scale(-aMag); // negative because gravity pulls inward
  }

  let a0 = getLocalGravity(relPosition);

  // 4. Simulate the local 2-body orbit
  for (let i = 0; i < steps; i++) {
    // Verlet integration in pure local space
    relPosition = relPosition.add(relVelocity.scale(dt)).add(a0.scale(0.5 * dt * dt));
    const a1 = getLocalGravity(relPosition);
    relVelocity = relVelocity.add(a0.add(a1).scale(0.5 * dt));
    a0 = a1;

    // Shift back to Global Space, but anchored to where the planet is RIGHT NOW
    const globalDrawPos = relPosition.add(dominantStartPos);
    path.push(globalDrawPos);

    // Crash detection (local distance check)
    if (relPosition.magnitude() < dominantBody.radius) {
      break;
    }
  }

  return path;
}