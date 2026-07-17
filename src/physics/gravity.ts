import { Vector3, Spacecraft, G, CelestialBody } from "./constants";

export function GravityCalculation(ship: Spacecraft, body: CelestialBody): Vector3 {
    const dx = body.position.x - ship.position.x;
}