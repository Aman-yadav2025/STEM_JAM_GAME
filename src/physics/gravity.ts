import { G, type CelestialBody, type Spacecraft } from "./constants.ts";
import { Vector3 } from "./vector3.ts";

// Gravity from a single object
export function GravityCalculation(ship: Spacecraft, body: CelestialBody): Vector3 {
    const r = body.position.subtract(ship.position);
    const distance = r.magnitude();

    if (distance === 0) {
        return Vector3.zero();
    }

    const F = G * body.mass / (distance * distance);
    return r.normalize().scale(F);
}

// get me most dominatant body
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


// calculate influence of all bodys
export function totalAcceleration(ship: Spacecraft, bodies: CelestialBody[]): Vector3 {
    
    // Start with a zero acceleration vector
    let totalAcc = Vector3.zero();

    // Loop through every planet/moon in the simulation
    for (const body of bodies) {
        // Calculate the pull from this specific body
        const accFromBody = GravityCalculation(ship, body);

        // Accumulate it into our total using your class's add method
        totalAcc = totalAcc.add(accFromBody);
    }

    return totalAcc;
}

// infulence of most dominantCody
export function DominantAccel(ship: Spacecraft, bodies: CelestialBody[]): Vector3 {
  const dominant = getCurrentSOIBody (ship, bodies);
  return GravityCalculation(ship, dominant);
}

export function computeSOIRadius(d: number, mBody: number, mPrimary: number): number {
  return d * Math.pow(mBody / mPrimary, 2 / 5);
}// compute SOI of a