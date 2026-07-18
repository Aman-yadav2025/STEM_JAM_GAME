import { Vector3 } from "./vector3";
import { G, type CelestialBody } from "./constants.ts";


// ---------------------------------------------------------------------------
// Orbital elements
// ---------------------------------------------------------------------------

export interface OrbitalElements {
    a: number;       // semi-major axis (m). Negative for hyperbolic orbits.
    e: number;        // eccentricity
    eVec: Vector3;     // eccentricity vector, points toward periapsis
    hVec: Vector3;     // specific angular momentum vector, orbit normal
    mu: number;        // gravitational parameter of the central body (G * mass)
    pHat: Vector3;      // unit vector toward periapsis (perifocal x-axis)
    qHat: Vector3;      // unit vector 90deg ahead in the orbital plane (perifocal y-axis)
}

/**
 * Computes classical orbital elements from a relative state vector
 * (position/velocity of the ship relative to the central body it's orbiting).
 */

export function computeOrbitalElements(relPos: Vector3, relVel: Vector3, mu: number): OrbitalElements {
    const r = relPos.magnitude();
    const v = relVel.magnitude();

    const hVec = relPos.cross(relVel);

    // e_vec = [(v^2 - mu/r) * r_vec - (r_vec . v_vec) * v_vec] / mu
    const eVec = relPos
        .scale(v * v - mu / r)
        .subtract(relVel.scale(relPos.dot(relVel)))
        .scale(1 / mu);
    const e = eVec.magnitude();

    const specificEnergy = (v * v) / 2 - mu / r;
    const a = -mu / (2 * specificEnergy);

    // Perifocal basis: pHat toward periapsis, qHat 90deg ahead in-plane.
    // For near-circular orbits (e ~ 0) eVec is degenerate, so fall back to
    // using the current radius direction as the reference "periapsis" axis -
    // any in-plane axis works for a circle, this just keeps continuity.
    const pHat = e > 1e-8 ? eVec.normalize() : relPos.normalize();
    const wHat = hVec.normalize(); // orbit normal
    const qHat = wHat.cross(pHat);

    return { a, e, eVec, hVec, mu, pHat, qHat };
}