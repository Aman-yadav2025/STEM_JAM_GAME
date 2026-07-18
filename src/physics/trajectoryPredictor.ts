import { Vector3 } from './vector3.ts';
import { type CelestialBody, type Spacecraft, G } from './constants.ts';
import { getCurrentSOIBody } from './gravity.ts';
import { computeOrbitalElements} from './orbitalElements.ts';

/**
 * Patched-conic trajectory predictor.
 *
 * Instead of numerically integrating gravity from every body every step,
 * this treats the ship as being under the influence of exactly ONE body
 * at a time (whichever one it's inside the Sphere of Influence of), and
 * propagates that as a pure two-body Kepler orbit using closed-form
 * equations. When the ship crosses an SOI boundary, we "patch" - stop
 * the old conic, and start a fresh one relative to the new body using
 * the ship's position/velocity at the crossing point as new initial
 * conditions.
 *
 * Limitation: CelestialBody has no parent reference, so bodies
 * themselves are assumed to move in straight lines (position + velocity*t)
 * over the prediction window. For long predictions this drifts from
 * reality since real bodies orbit too - swap in a proper ephemeris /
 * recursive Kepler propagation of the bodies themselves for higher
 * fidelity if needed.
 */



/** Approximates a body's position at time t seconds from now (linear extrapolation). */
function bodyPositionAtTime(body: CelestialBody, t: number): Vector3 {
    return body.position.add(body.velocity.scale(t));
}


// ---------------------------------------------------------------------------
// Kepler's equation solvers
// ---------------------------------------------------------------------------

function solveKeplerElliptic(M: number, e: number, tolerance = 1e-10, maxIter = 100): number {
    // Wrap M into [-pi, pi] for a well-behaved initial guess.
    let E = e < 0.8 ? M : Math.PI * Math.sign(M || 1);

    for (let i = 0; i < maxIter; i++) {
        const f = E - e * Math.sin(E) - M;
        const fPrime = 1 - e * Math.cos(E);
        const delta = f / fPrime;
        E -= delta;
        if (Math.abs(delta) < tolerance) break;
    }
    return E;
}

function solveKeplerHyperbolic(M: number, e: number, tolerance = 1e-10, maxIter = 100): number {
    let H = Math.asinh(M / e) || M; // rough starting guess

    for (let i = 0; i < maxIter; i++) {
        const f = e * Math.sinh(H) - H - M;
        const fPrime = e * Math.cosh(H) - 1;
        const delta = f / fPrime;
        H -= delta;
        if (Math.abs(delta) < tolerance) break;
    }
    return H;
}

// ---------------------------------------------------------------------------
// Closed-form propagation
// ---------------------------------------------------------------------------

export interface RelativeState {
    position: Vector3;
    velocity: Vector3;
}

/**
 * Propagates a relative state (position/velocity around a central body)
 * forward by dt seconds using the analytic Kepler solution - no
 * step-by-step numerical integration required.
 */
export function propagateKepler(relPos: Vector3, relVel: Vector3, mu: number, dt: number): RelativeState {
    const elements = computeOrbitalElements(relPos, relVel, mu);
    const { a, e, pHat, qHat } = elements;
    const r0 = relPos.magnitude();

    if (e < 1) {
        // --- Elliptical case ---
        const n = Math.sqrt(mu / (a * a * a)); // mean motion

        const cosE0 = (1 - r0 / a) / e || 1; // guard for e ~ 0
        const sinE0 = relPos.dot(relVel) / (e * Math.sqrt(mu * a) || 1);
        const E0 = e > 1e-8 ? Math.atan2(sinE0, cosE0) : Math.atan2(relPos.dot(qHat), relPos.dot(pHat));

        const M0 = E0 - e * Math.sin(E0);
        const M = M0 + n * dt;
        const E = solveKeplerElliptic(M, e);

        const r = a * (1 - e * Math.cos(E));
        const xPf = a * (Math.cos(E) - e);
        const yPf = a * Math.sqrt(1 - e * e) * Math.sin(E);

        const factor = Math.sqrt(mu * a) / r;
        const vxPf = -factor * Math.sin(E);
        const vyPf = factor * Math.sqrt(1 - e * e) * Math.cos(E);

        return {
            position: pHat.scale(xPf).add(qHat.scale(yPf)),
            velocity: pHat.scale(vxPf).add(qHat.scale(vyPf)),
        };
    } else {
        // --- Hyperbolic case (escape trajectory) ---
        const absA = -a; // a is negative for hyperbolas, work with magnitude
        const n = Math.sqrt(mu / (absA * absA * absA));

        const coshH0 = (1 - r0 / a) / e;
        const sinhH0 = relPos.dot(relVel) / (e * Math.sqrt(mu * absA));
        const H0 = Math.asinh(sinhH0);
        void coshH0; // sign consistency comes for free via asinh; kept for clarity

        const M0 = e * Math.sinh(H0) - H0;
        const M = M0 + n * dt;
        const H = solveKeplerHyperbolic(M, e);

        const r = a * (1 - e * Math.cosh(H));
        const xPf = a * (Math.cosh(H) - e);
        const yPf = -a * Math.sqrt(e * e - 1) * Math.sinh(H);

        const factor = Math.sqrt(mu * absA) / r;
        const vxPf = -factor * Math.sinh(H);
        const vyPf = factor * Math.sqrt(e * e - 1) * Math.cosh(H);

        return {
            position: pHat.scale(xPf).add(qHat.scale(yPf)),
            velocity: pHat.scale(vxPf).add(qHat.scale(vyPf)),
        };
    }
}

// ---------------------------------------------------------------------------
// Full patched-conic trajectory prediction
// ---------------------------------------------------------------------------

export interface TrajectoryPoint {
    time: number;          // seconds from prediction start
    position: Vector3;     // absolute world-frame position
    velocity: Vector3;     // absolute world-frame velocity
    soiBody: CelestialBody; // which body's SOI this point is patched against
}

export interface PredictionOptions {
    duration: number;          // total time to predict, seconds
    timeStep: number;          // sample interval, seconds
    patchTolerance?: number;   // bisection tolerance (seconds) for SOI crossing time
}

/** Finds which body's SOI a given absolute position at time t falls inside (same rule as getCurrentSOIBody). */
function resolveSOIAt(position: Vector3, t: number, bodies: CelestialBody[]): CelestialBody {
    let best: CelestialBody | null = null;

    for (const body of bodies) {
        const bodyPos = bodyPositionAtTime(body, t);
        const distance = position.distanceTo(bodyPos);
        if (distance < body.soiRadius) {
            if (best === null || body.soiRadius < best.soiRadius) {
                best = body;
            }
        }
    }

    if (best !== null) return best;

    let primary = bodies[0];
    for (const body of bodies) {
        if (body.soiRadius > primary.soiRadius) primary = body;
    }
    return primary;
}

/**
 * Predicts the ship's trajectory over `duration` seconds using patched
 * conics: within each SOI segment, position/velocity are computed
 * analytically via propagateKepler (cheap, exact for the two-body
 * problem). When a sample is found to have crossed into a different
 * body's SOI, we bisect between the last good sample and the new one to
 * pin down the crossing time, then start a fresh conic segment there.
 */
export function predictTrajectory(
    ship: Spacecraft,
    bodies: CelestialBody[],
    options: PredictionOptions
): TrajectoryPoint[] {
    const { duration, timeStep } = options;
    const patchTolerance = options.patchTolerance ?? 0.05;

    const points: TrajectoryPoint[] = [];

    let currentBody = getCurrentSOIBody(ship, bodies);
    let epochTime = 0; // segment-local epoch, in absolute prediction time
    let epochRelPos = ship.position.subtract(currentBody.position);
    let epochRelVel = ship.velocity.subtract(currentBody.velocity);

    const sampleAbsoluteState = (t: number): { position: Vector3; velocity: Vector3 } => {
        const mu = G * currentBody.mass;
        const rel = propagateKepler(epochRelPos, epochRelVel, mu, t - epochTime);
        const bodyPos = bodyPositionAtTime(currentBody, t);
        return {
            position: bodyPos.add(rel.position),
            velocity: currentBody.velocity.add(rel.velocity),
        };
    };

    points.push({ time: 0, position: ship.position, velocity: ship.velocity, soiBody: currentBody });

    let t = 0;
    while (t < duration) {
        const nextT = Math.min(t + timeStep, duration);
        const state = sampleAbsoluteState(nextT);
        const soiAtNext = resolveSOIAt(state.position, nextT, bodies);

        if (soiAtNext === currentBody) {
            points.push({ time: nextT, position: state.position, velocity: state.velocity, soiBody: currentBody });
            t = nextT;
            continue;
        }

        // SOI crossing happened somewhere between t and nextT - bisect to find it.
        let lo = t;
        let hi = nextT;
        let crossingState = state;
        let crossingBody = soiAtNext;

        while (hi - lo > patchTolerance) {
            const mid = (lo + hi) / 2;
            const midState = sampleAbsoluteState(mid);
            const midBody = resolveSOIAt(midState.position, mid, bodies);

            if (midBody === currentBody) {
                lo = mid;
            } else {
                hi = mid;
                crossingState = midState;
                crossingBody = midBody;
            }
        }

        // Record the patch point, then start a new conic segment relative to the new body.
        points.push({ time: hi, position: crossingState.position, velocity: crossingState.velocity, soiBody: crossingBody });

        currentBody = crossingBody;
        epochTime = hi;
        epochRelPos = crossingState.position.subtract(bodyPositionAtTime(currentBody, hi));
        epochRelVel = crossingState.velocity.subtract(currentBody.velocity);

        t = hi;
    }

    return points;
}