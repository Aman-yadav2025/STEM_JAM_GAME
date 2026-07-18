import { G, type CelestialBody, type Spacecraft } from "./constants.ts";
import { Vector3 } from "./vector3.ts";

export function GravityCalculation(ship: Spacecraft, body: CelestialBody): Vector3 {
    const r = body.position.subtract(ship.position);
    const distance = r.magnitude();

    if (distance === 0) {
        return Vector3.zero();
    }

    const F = G * body.mass / (distance * distance);
    return r.normalize().scale(F);
}

export function getCurrentSOIBody(ship: Spacecraft, bodies: CelestialBody[]): CelestialBody{
    let closestBody = bodies[0];
    let inSOI = false;

    for(const body of bodies){
        const distance = ship.position.distanceTo(body.position);
        if(distance < body.soiRadius){
            closestBody = body;
            inSOI = true;
            break;                  // It breaks when the first SOI matches , so for multiple SOI we will have the innermost (like moon) in front. keep in mind when making World.ts
        }
    }

    return inSOI ? closestBody : bodies[0];   // if none found, default to the sun.
}


