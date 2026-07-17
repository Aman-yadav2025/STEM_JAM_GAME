import { G, type CelestialBody, type Spacecraft } from "./constants";
import { Vector3 } from "./vector3";

export function GravityCalculation(ship: Spacecraft, body: CelestialBody): Vector3 {
    const dx = body.position.x - ship.position.x;
    const dy = body.position.y - ship.position.y;
    const dz = body.position.z - ship.position.z;
    const r = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (r === 0) {
        return new Vector3(0, 0, 0);
    }

    const F = G * body.mass / (r * r);
    const direction = new Vector3(dx / r, dy / r, dz / r);
    return direction.scale(F);
}