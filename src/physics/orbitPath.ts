import { Vector3 } from "./vector3";
import { type CelestialBody } from "./constants";


export interface OrbitPath {
    parentBody: CelestialBody | null; // null = doesn't orbit anything (like sun)
    orbitalRadius: number;            // distance from parent , assume circular for simplicity
    orbitalPeriod: number;            
    initialAngle: number;             // starting position at t = 0
}

export function bodyPositionAtTime(orbit: OrbitPath, time: number): Vector3 {
    if (orbit.parentBody === null) { return Vector3.zero(); }

    const angle = orbit.initialAngle + (2 * Math.PI * time) / orbit.orbitalPeriod;
    const parentPos = orbit.parentBody.position;

    return new Vector3(
        parentPos.x + orbit.orbitalRadius * Math.cos(angle),
        parentPos.y + orbit.orbitalRadius * Math.sin(angle),
        parentPos.z
    );
}