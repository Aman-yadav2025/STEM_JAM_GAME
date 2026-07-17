import { Vector3 } from "./vector3";
import { G, type CelestialBody } from "./constants";

export interface OrbitalElements {            // may need to add true anomaly
    semiMajorAxis: number;
    eccentricity: number;
    inclination: number; // if we extend to 3D
    apoapsis: number;
    periapsis: number;
    orbitalPeriod: number | null; // null if e >= 1
    specificAngularMomentum: Vector3;
    specificEnergy: number;
}

export function standardGravitationalParameter(body: CelestialBody): number {
    return G * body.mass;
}

function specificOrbitalEnergy(r: Vector3, v: Vector3, mu: number): number {
    const speedSquared = v.dot(v);
    const distance = r.magnitude();
    return speedSquared / 2 - mu / distance;
}

function eccentricityVector(r: Vector3, v: Vector3, mu: number): Vector3 {

    const term1 = r.scale(v.dot(v) - mu / r.magnitude());
    const term2 = v.scale(r.dot(v));

    return term1.subtract(term2).scale(1 / mu);                   
}


export function computeOrbitalElements(shipPosition: Vector3, shipVelocity: Vector3, referenceBody: CelestialBody ): OrbitalElements {   
    const mu = standardGravitationalParameter(referenceBody);

    const r = shipPosition.subtract(referenceBody.position);
    const v = shipVelocity.subtract(referenceBody.velocity);

    const h = r.cross(v);
    const energy = specificOrbitalEnergy(r, v, mu);
    const eVec = eccentricityVector(r, v, mu);
    const eccentricity = eVec.magnitude();

    const semiMajorAxis = energy !== 0 ? -mu / (2 * energy) : Infinity;

    const inclination = Math.acos(h.z / h.magnitude());    

    const apoapsis = eccentricity < 1 ? semiMajorAxis * (1 + eccentricity) : Infinity;
    const periapsis = semiMajorAxis * (1 - eccentricity);

    const orbitalPeriod = eccentricity < 1 ? 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxis, 3) / mu) : null;

    return { semiMajorAxis, eccentricity, inclination, apoapsis, periapsis, orbitalPeriod, specificAngularMomentum: h, specificEnergy: energy };
}