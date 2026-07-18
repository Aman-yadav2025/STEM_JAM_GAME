import { useEffect, useRef, useState } from 'react';
import { Vector3 } from '../physics/vector3.ts';
import { type CelestialBody, type Spacecraft, G } from '../physics/constants.ts';
import { step } from '../physics/integrator.ts';
import { applyBurn, type BurnDirection } from '../physics/burn.ts';
import { predictTrajectory, type TrajectoryPoint } from '../physics/trajectoryPredictor.ts';
import { computeOrbitalElements } from '../physics/orbitalElements.ts';

const CANVAS_SIZE = 1000;
const TRAIL_LENGTH = 100;
const SIM_DT = 1e-2 * 50;
const BURN_DELTA_V = 100; // m/s applied per button click
const PREDICTION_SAMPLES = 150; // points along the long-range patched-conic prediction
const PREDICTION_FALLBACK_DURATION = 20000; // seconds to look ahead on escape (non-periodic) trajectories
const NEAR_TERM_STEPS = 3000; // how many real dt steps the red line looks ahead
const FAST_FORWARD_MULTIPLIER = 2; // substeps/frame while fast-forward is active

/** True if `position` is inside any body's solid radius. */
function findCollision(position: Vector3, bodies: CelestialBody[]): CelestialBody | null {
    for (const body of bodies) {
        if (position.distanceTo(body.position) < body.radius) {
            return body;
        }
    }
    return null;
}

/**
 * Runs the real Verlet step() forward `steps` times on a CLONE of the
 * ship, returning the exact path it takes. Unlike the patched-conic
 * prediction, this uses the same totalAcceleration() as the live sim -
 * every body pulling on the ship, no single-dominant-body assumption -
 * so it can't drift from what actually happens next. Cheap because the
 * horizon is short (10 steps, not a full orbit).
 *
 * Stops early if the shadow ship hits a body, so the drawn line never
 * cuts through a planet.
 */
function shadowStepsAhead(ship: Spacecraft, bodies: CelestialBody[], dt: number, steps: number): Vector3[] {
    const shadowShip: Spacecraft = {
        ...ship,
        position: new Vector3(ship.position.x, ship.position.y, ship.position.z),
        velocity: new Vector3(ship.velocity.x, ship.velocity.y, ship.velocity.z),
    };

    const points: Vector3[] = [shadowShip.position];
    for (let i = 0; i < steps; i++) {
        step(shadowShip, bodies, dt);
        points.push(shadowShip.position);

        if (findCollision(shadowShip.position, bodies)) {
            break;
        }
    }
    return points;
}

/**
 * Trims a patched-conic prediction at the first sample that lands inside
 * a body's solid radius, so the drawn line stops at impact instead of
 * passing through the planet. predictTrajectory() itself has no notion
 * of solid bodies (it only cares about SOI boundaries), so this is done
 * as a post-pass on the returned points.
 */
function trimPredictionAtCollision(points: TrajectoryPoint[], bodies: CelestialBody[]): TrajectoryPoint[] {
    for (let i = 0; i < points.length; i++) {
        if (findCollision(points[i].position, bodies)) {
            return points.slice(0, i + 1);
        }
    }
    return points;
}

export default function OrbitView() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const shipRef = useRef<Spacecraft | null>(null);
    const bodiesRef = useRef<CelestialBody[]>([]);
    const crashedRef = useRef<CelestialBody | null>(null);

    // Fast-forward is read inside the render loop via a ref (not just React
    // state) so toggling it takes effect on the very next frame without
    // needing to re-run the whole useEffect setup.
    const fastForwardRef = useRef(false);
    const [fastForward, setFastForward] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const planet: CelestialBody = {
            name: 'Terra',
            mass: 5.972e24,
            radius: 2.371e6,
            position: new Vector3(-6e6, +6e6, 0),
            velocity: Vector3.zero(),
            soiRadius: 7.29e8,
            color: '#3399ff',
        };

        const planet2: CelestialBody = {
            name: 'Terra',
            mass: 1.972e24,
            radius: 2.371e6,
            position: new Vector3(6e6, +6e6, 0),
            velocity: Vector3.zero(),
            soiRadius: 7.29e8,
            color: '#3399ff',
        };

        const planet3: CelestialBody = {
            name: 'Terra',
            mass: 1.972e24,
            radius: 2.371e6,
            position: new Vector3(0, -6e6, 0),
            velocity: Vector3.zero(),
            soiRadius: 9.29e8,
            color: '#3399ff',
        };

        const orbitRadius = 2.771e6;
        const mu = G * planet.mass;
        const circularSpeed = Math.sqrt(mu / orbitRadius);

        shipRef.current = {
            id: 1,
            position: new Vector3(orbitRadius - 6e6, +6e6, 0),
            velocity: new Vector3(0, circularSpeed, 0),
            mass: 1000,
            fuel: 1e23,
        };
        // planet3 now included, so the ship can both fall under its gravity
        // and collide with it - previously it was drawn but had no physical
        // presence in the sim.
        bodiesRef.current = [planet, planet2, planet3];
        crashedRef.current = null;

        const worldToPixelScale = CANVAS_SIZE / 6 / (orbitRadius * 1.6);
        const originX = CANVAS_SIZE / 2;
        const originY = CANVAS_SIZE / 2;

        const trail: { x: number; y: number }[] = [];
        let animationFrameId: number;

        const worldToCanvas = (v: Vector3) => ({
            x: originX + v.x * worldToPixelScale,
            y: originY - v.y * worldToPixelScale,
        });

        const render = () => {
            const ship = shipRef.current;
            const bodies = bodiesRef.current;
            if (!ship) return;

            const substeps = fastForwardRef.current ? FAST_FORWARD_MULTIPLIER : 1;

            if (!crashedRef.current) {
                for (let i = 0; i < substeps; i++) {
                    // Advance by exactly one full SIM_DT using the analytic
                    // patched-conic propagator. timeStep === duration means
                    // predictTrajectory returns exactly 2 points: [0]=start,
                    // [1]=the state after one full SIM_DT - so index 1 is
                    // always the correct next state, not a half-step.
                    const [, next] = predictTrajectory(ship, bodies, {
                        duration: SIM_DT,
                        timeStep: SIM_DT,
                    });
                    ship.position = new Vector3(next.position.x, next.position.y, 0);
                    ship.velocity = new Vector3(next.velocity.x, next.velocity.y, 0);

                    // Check collision after every substep, not just once at
                    // the end - at high fast-forward multipliers, a full
                    // batch of substeps could otherwise jump clean over a
                    // planet within a single frame.
                    const hitMidLoop = findCollision(ship.position, bodies);
                    if (hitMidLoop) {
                        crashedRef.current = hitMidLoop;
                        shipRef.current = { ...ship, velocity: Vector3.zero() };
                        break;
                    }
                }
            }

            const shipScreen = worldToCanvas(ship.position);
            trail.push(shipScreen);
            if (trail.length > TRAIL_LENGTH) trail.shift();

            ctx.fillStyle = '#0a0e1a';
            ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

            if (!crashedRef.current) {
                const relPos = ship.position.subtract(planet.position);
                const relVel = ship.velocity.subtract(planet.velocity);
                const elements = computeOrbitalElements(relPos, relVel, mu);
                const predictionDuration =
                    elements.e < 1
                        ? 2 * Math.PI * Math.sqrt(Math.pow(elements.a, 3) / mu)
                        : PREDICTION_FALLBACK_DURATION;

                const rawPrediction = predictTrajectory(ship, bodies, {
                    duration: predictionDuration,
                    timeStep: predictionDuration / PREDICTION_SAMPLES,
                });
                const prediction = trimPredictionAtCollision(rawPrediction, bodies);

                ctx.beginPath();
                prediction.forEach((p, i) => {
                    const screen = worldToCanvas(p.position);
                    if (i === 0) ctx.moveTo(screen.x, screen.y);
                    else ctx.lineTo(screen.x, screen.y);
                });
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.setLineDash([]);
            }

            ctx.beginPath();
            trail.forEach((p, i) => {
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.strokeStyle = 'rgba(102, 200, 255, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            if (!crashedRef.current) {
                const nearTermPath = shadowStepsAhead(ship, bodies, SIM_DT, NEAR_TERM_STEPS);
                ctx.beginPath();
                nearTermPath.forEach((pos, i) => {
                    const screen = worldToCanvas(pos);
                    if (i === 0) ctx.moveTo(screen.x, screen.y);
                    else ctx.lineTo(screen.x, screen.y);
                });
            }

            const planetScreen = worldToCanvas(planet.position);
            const planetPixelRadius = Math.max(planet.radius * worldToPixelScale, 6);
            ctx.beginPath();
            ctx.arc(planetScreen.x, planetScreen.y, planetPixelRadius, 0, Math.PI * 2);
            ctx.fillStyle = planet.color;
            ctx.fill();

            const planet2Screen = worldToCanvas(planet2.position);
            const planet2PixelRadius = Math.max(planet2.radius * worldToPixelScale, 6);
            ctx.beginPath();
            ctx.arc(planet2Screen.x, planet2Screen.y, planet2PixelRadius, 0, Math.PI * 2);
            ctx.fillStyle = planet2.color;
            ctx.fill();

            const planet3Screen = worldToCanvas(planet3.position);
            const planet3PixelRadius = Math.max(planet3.radius * worldToPixelScale, 6);
            ctx.beginPath();
            ctx.arc(planet3Screen.x, planet3Screen.y, planet3PixelRadius, 0, Math.PI * 2);
            ctx.fillStyle = planet3.color;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(shipScreen.x, shipScreen.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = crashedRef.current ? '#ff5555' : '#ffffff';
            ctx.fill();

            const radius = ship.position.distanceTo(planet.position);
            const speed = ship.velocity.magnitude();
            ctx.fillStyle = '#8fa3c0';
            ctx.font = '12px monospace';
            ctx.fillText(`radius: ${(radius / 1000).toFixed(1)} km`, 12, 20);
            ctx.fillText(`speed:  ${speed.toFixed(1)} m/s`, 12, 36);
            ctx.fillText(`fuel:   ${ship.fuel.toFixed(0)} kg`, 12, 52);
            if (fastForwardRef.current) {
                ctx.fillText(`speed x${FAST_FORWARD_MULTIPLIER}`, 12, 68);
            }

            if (crashedRef.current) {
                ctx.fillStyle = '#ff5555';
                ctx.font = '14px monospace';
                ctx.fillText(`CRASHED into ${crashedRef.current.name}`, 12, 84);
            }

            animationFrameId = requestAnimationFrame(render);
        };

        animationFrameId = requestAnimationFrame(render);

        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    const burn = (direction: BurnDirection) => {
        if (!shipRef.current || crashedRef.current) return;
        shipRef.current = applyBurn(shipRef.current, bodiesRef.current, direction, BURN_DELTA_V);
    };

    const toggleFastForward = () => {
        fastForwardRef.current = !fastForwardRef.current;
        setFastForward(fastForwardRef.current); // only used to re-render the button label
    };

    return (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                style={{ background: '#0a0e1a', borderRadius: 8 }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => burn('prograde')}>Accelerate Prograde</button>
                <button onClick={() => burn('retrograde')}>Accelerate Retrograde</button>
                <button onClick={() => burn('radial-out')}>Accelerate Radially Outward</button>
                <button onClick={() => burn('radial-in')}>Accelerate Radially Inward</button>
                <button onClick={toggleFastForward}>
                    {fastForward ? `Fast Forward: ON (x${FAST_FORWARD_MULTIPLIER})` : 'Fast Forward: OFF'}
                </button>
            </div>
        </div>
    );
}