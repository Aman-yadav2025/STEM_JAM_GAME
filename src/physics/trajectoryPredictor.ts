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
  const predictedBodies: MovingBody[] = bodies.map((b) => ({ ...b, position: b.position.clone() }));

  let position = startPosition.clone();
  let velocity = startVelocity.clone();
  let t = startTime;

  const path: Vector3[] = [position.clone()];

  updateBodyPositions(predictedBodies, t);
  let a0 = DominantAccel(position, predictedBodies);

  for (let i = 0; i < steps; i++) {
    // Position update uses the acceleration sample from the START of this step.
    position = position.add(velocity.scale(dt)).add(a0.scale(0.5 * dt * dt));
    t += dt;

    // Move bodies to the new time, then take the SECOND acceleration sample
    // at the ship's new position.
    updateBodyPositions(predictedBodies, t);
    const a1 = DominantAccel(position, predictedBodies);

    // Velocity update uses the average of both samples — this averaging is
    // what makes Verlet symplectic/energy-conserving, unlike Euler.
    velocity = velocity.add(a0.add(a1).scale(0.5 * dt));

    a0 = a1; // reuse as next iteration's starting sample — avoids recomputing

    path.push(position.clone());

    const crashed = predictedBodies.some(
      (body) => position.distanceTo(body.position) < body.radius
    );
    if (crashed) break;
  }

  return path;
}
