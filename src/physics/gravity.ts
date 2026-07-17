import { G, type CelestialBody, type Spacecraft } from "./constants";
import { Vector3 } from "./vector3";

export function GravityCalculation(ship: Spacecraft, body: CelestialBody): Vector3 {
    const r = body.position.subtract(ship.position);
    const distance = r.magnitude();

    if (distance === 0) {
        return Vector3.zero();
    }

    const F = G * body.mass / (distance * distance);
    return r.normalize().scale(F);
}


