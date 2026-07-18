import { useEffect, useRef } from 'react';
import { Vector3 } from '../physics/vector3.ts';
import { type CelestialBody, type Spacecraft, G } from '../physics/constants.ts';
import { step } from '../physics/integrator.ts';
import { applyBurn } from '../physics/burn.ts';
import { predictTrajectory } from '../physics/trajectoryPredictor.ts';
import { computeOrbitalElements } from '../physics/orbitalElements.ts';

const CANVAS_SIZE = 1000;
const TRAIL_LENGTH = 100;
const SIM_DT = 6;
const SUBSTEPS_PER_FRAME = 1;
const BURN_DELTA_V = 200; // m/s applied per button click
const PREDICTION_SAMPLES = 150; // points along the long-range patched-conic prediction
const PREDICTION_FALLBACK_DURATION = 20000; // seconds to look ahead on escape (non-periodic) trajectories
const NEAR_TERM_STEPS = 3000; // how many real dt steps the red line looks ahead

/**
 * Runs the real Verlet step() forward `steps` times on a CLONE of the
 * ship, returning the exact path it takes. Unlike the patched-conic
 * prediction, this uses the same totalAcceleration() as the live sim -
 * every body pulling on the ship, no single-dominant-body assumption -
 * so it can't drift from what actually happens next. Cheap because the
 * horizon is short (10 steps, not a full orbit).
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
    }
    return points;
}

export default function OrbitView() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // Ship/bodies live in refs (not effect-local consts) so the button
    // handlers below - which run outside the render loop's closure - can
    // read and replace them mid-flight.
    const shipRef = useRef<Spacecraft | null>(null);
    const bodiesRef = useRef<CelestialBody[]>([]);

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
            position: new Vector3(orbitRadius -6e6, +6e6, 0),
            velocity: new Vector3(0, circularSpeed, 0),
            mass: 1000,
            fuel: 1e23,
        };
        bodiesRef.current = [planet, planet2];

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

            for (let i = 0; i < SUBSTEPS_PER_FRAME; i++) {
                step(ship, bodies, SIM_DT);
            }

            const shipScreen = worldToCanvas(ship.position);
            trail.push(shipScreen);
            if (trail.length > TRAIL_LENGTH) trail.shift();

            ctx.fillStyle = '#0a0e1a';
            ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

            // --- Predicted path: analytic patched-conic look-ahead from the ship's
            // current state, recomputed fresh every frame so it updates instantly
            // after a burn. One full period ahead for closed orbits; a fixed
            // window ahead for escape (hyperbolic) trajectories. ---
            const relPos = ship.position.subtract(planet.position);
            const relVel = ship.velocity.subtract(planet.velocity);
            const elements = computeOrbitalElements(relPos, relVel, mu);
            const predictionDuration =
                elements.e < 1
                    ? 2 * Math.PI * Math.sqrt(Math.pow(elements.a, 3) / mu)
                    : PREDICTION_FALLBACK_DURATION;

            const prediction = predictTrajectory(ship, bodies, {
                duration: predictionDuration,
                timeStep: predictionDuration / PREDICTION_SAMPLES,
            });

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

            // --- Actual flown path (real integrated trail) ---
            ctx.beginPath();
            trail.forEach((p, i) => {
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.strokeStyle = 'rgba(102, 200, 255, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // --- Short-horizon "ground truth" path: real Verlet steps on a
            // cloned ship, so it correctly reflects every body's pull (no
            // single-dominant-body simplification) even while deep inside
            // one SOI. ---
            const nearTermPath = shadowStepsAhead(ship, bodies, SIM_DT, NEAR_TERM_STEPS);
            ctx.beginPath();
            nearTermPath.forEach((pos, i) => {
                const screen = worldToCanvas(pos);
                if (i === 0) ctx.moveTo(screen.x, screen.y);
                else ctx.lineTo(screen.x, screen.y);
            });
            ctx.setLineDash([6, 4]);
            ctx.strokeStyle = 'rgba(255, 220, 120, 0.7)';
            ctx.lineWidth = 2;
            ctx.stroke();

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
            ctx.fillStyle = '#ffffff';
            ctx.fill();

            const radius = ship.position.distanceTo(planet.position);
            const speed = ship.velocity.magnitude();
            ctx.fillStyle = '#8fa3c0';
            ctx.font = '12px monospace';
            ctx.fillText(`radius: ${(radius / 1000).toFixed(1)} km`, 12, 20);
            ctx.fillText(`speed:  ${speed.toFixed(1)} m/s`, 12, 36);
            ctx.fillText(`fuel:   ${ship.fuel.toFixed(0)} kg`, 12, 52);

            animationFrameId = requestAnimationFrame(render);
        };

        animationFrameId = requestAnimationFrame(render);

        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    // applyBurn returns a brand-new Spacecraft rather than mutating in place,
    // so we just swap the ref - the render loop above always reads
    // shipRef.current fresh each frame, so this takes effect on the next tick.
    const burn = (direction: 'prograde' | 'radial-out') => {
        if (!shipRef.current) return;
        shipRef.current = applyBurn(shipRef.current, bodiesRef.current, direction, BURN_DELTA_V);
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
                <button onClick={() => burn('radial-out')}>Accelerate Radially Outward</button>
            </div>
        </div>
    );
}