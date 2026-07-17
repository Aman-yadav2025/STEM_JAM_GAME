import { type CelestialBody, type Spacecraft } from "./constants"
import { Vector3 } from "./vector3"
import { GravityCalculation } from "./gravity";

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

export function step(ship: Spacecraft, bodies: CelestialBody[], dt: number) {
    const a0 = totalAcceleration(ship, bodies);

    ship.position = ship.position
        .add(ship.velocity.scale(dt))
        .add(a0.scale(0.5 * dt * dt));

    const a1 = totalAcceleration(ship, bodies);

    ship.velocity = ship.velocity.add(a0.add(a1).scale(0.5 * dt));
}