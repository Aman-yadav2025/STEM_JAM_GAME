import { Vector3, type CelestialBody, type Spacecraft } from "./constants"
import { GravityCalculation } from "./gravity"; // Adjust path if needed

export function totalAcceleration(ship: Spacecraft, bodies: CelestialBody[]): Vector3 {
    // Start with a zero acceleration vector
    let totalAcc = new Vector3(0, 0, 0);

    // Loop through every planet/moon in the simulation
    for (const body of bodies) {
        // Calculate the pull from this specific body
        const accFromBody = GravityCalculation(ship, body);
        
        // Accumulate it into our total using your class's add method
        totalAcc = totalAcc.add(accFromBody);
    }

    return totalAcc;
}

export function step(ship :Spacecraft, bodies: CelestialBody[], dt: number){
    let a0 = totalAcceleration(ship, bodies);
    ship.position.x += ship.velocity.x * dt + 0.5 * a0.x * dt * dt;
    ship.position.y += ship.velocity.y * dt + 0.5 * a0.y * dt * dt;
    ship.position.z += ship.velocity.z * dt + 0.5 * a0.z * dt * dt;

    let a1 = totalAcceleration(ship, bodies);
    ship.velocity.x += 0.5 * (a0.x + a1.x) * dt;
    ship.velocity.y += 0.5 * (a0.y + a1.y) * dt;
    ship.velocity.z += 0.5 * (a0.z + a1.z) * dt;
}