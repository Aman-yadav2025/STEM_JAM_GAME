/**
 * Smoke test: initializes a planet + a ship on a circular-ish orbit, runs
 * the velocity-Verlet integrator for a simulated duration, and logs
 * position/velocity/orbital radius over time so you can sanity-check the
 * physics (stays in a bounded orbit, doesn't NaN out, etc).
 *
 * No rendering, no requestAnimationFrame loop, no controls - just fixed
 * timesteps run synchronously to completion.
 *
 * Run with: npx ts-node test/orbitSmokeTest.ts
 */

import { Vector3 } from '../src/physics/vector3.ts';
import { type CelestialBody, type Spacecraft, G } from '../src/physics/constants.ts';
import { step } from '../src/physics/integrator.ts';

// --- Body #1: a planet sitting at the origin ---
const planet: CelestialBody = {
    name: 'Terra',
    mass: 5.972e24,     // kg, Earth-like
    radius: 6.371e6,     // m
    position: Vector3.zero(),
    velocity: Vector3.zero(),
    soiRadius: 9.29e8,    // m, roughly Earth's real SOI radius
    color: '#3399ff',
};

// --- Body #2: the ship, placed on a circular low orbit ---
const orbitRadius = 6.771e6; // ~400km altitude
const mu = G * planet.mass;
const circularSpeed = Math.sqrt(mu / orbitRadius); // vis-viva, e = 0

const ship: Spacecraft = {
    id: 1,
    position: new Vector3(orbitRadius, 0, 0),
    velocity: new Vector3(0, circularSpeed, 0),
    mass: 1000, // kg
    fuel: 500,  // kg
};

const bodies: CelestialBody[] = [planet];

// --- Run it ---
const dt = 1;                  // seconds per physics step
const orbitalPeriod = 2 * Math.PI * Math.sqrt((orbitRadius ** 3) / mu);
const durationSeconds = orbitalPeriod * 1.5; // run for 1.5 orbits
const logEveryNSteps = Math.round(orbitalPeriod / 12 / dt); // ~12 samples/orbit

let minRadius = Infinity;
let maxRadius = -Infinity;

console.log(`Circular speed:    ${circularSpeed.toFixed(2)} m/s`);
console.log(`Orbital period:    ${orbitalPeriod.toFixed(1)} s (${(orbitalPeriod / 60).toFixed(1)} min)`);
console.log(`Simulating:        ${durationSeconds.toFixed(0)} s\n`);
console.log('t(s)\t\tx\t\ty\t\tspeed\t\tradius');

for (let t = 0; t <= durationSeconds; t += dt) {
    const radius = ship.position.distanceTo(planet.position);
    minRadius = Math.min(minRadius, radius);
    maxRadius = Math.max(maxRadius, radius);

    if (Math.round(t / dt) % logEveryNSteps === 0) {
        const speed = ship.velocity.magnitude();
        console.log(
            `${t.toFixed(0)}\t\t${ship.position.x.toFixed(0)}\t${ship.position.y.toFixed(0)}\t${speed.toFixed(2)}\t\t${radius.toFixed(0)}`
        );
    }

    step(ship, bodies, dt);

    if (!Number.isFinite(ship.position.x) || !Number.isFinite(ship.velocity.x)) {
        throw new Error(`Simulation blew up (NaN/Infinity) at t=${t}s`);
    }
}

console.log('\n--- Summary ---');
console.log(`Starting radius:   ${orbitRadius.toFixed(0)} m`);
console.log(`Min radius seen:   ${minRadius.toFixed(0)} m`);
console.log(`Max radius seen:   ${maxRadius.toFixed(0)} m`);
console.log(`Radius drift:      ${(maxRadius - minRadius).toFixed(0)} m (${(((maxRadius - minRadius) / orbitRadius) * 100).toFixed(3)}%)`);
console.log(
    maxRadius - minRadius < orbitRadius * 0.01
        ? 'PASS: orbit stayed roughly circular, physics looks sane.'
        : 'WARN: radius drifted noticeably - check integrator/gravity implementation.'
);