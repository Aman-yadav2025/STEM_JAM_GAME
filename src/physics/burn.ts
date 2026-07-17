import { type CelestialBody, type Spacecraft } from "./constants";
import { Vector3 } from "./vector3";

export type BurnDirection = "prograde" | "retrograde" | "radial-in" | "radial-out" | "normal" | "antinormal";
const FUEL_BURN_RATE = 1; // kg of fuel per unit of deltaV — tune this later



function getCurrentSOIBody(ship: Spacecraft, bodies: CelestialBody[]): CelestialBody{
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


function getBurnDirectionVector(ship: Spacecraft, bodies: CelestialBody[], direction: BurnDirection): Vector3 {
    
    switch (direction) {
        case "prograde":
            return ship.velocity.normalize();
        case "retrograde":
            return ship.velocity.normalize().scale(-1);
        case "radial-out": {
            const referenceBody = getCurrentSOIBody(ship, bodies);
            return ship.position.subtract(referenceBody.position).normalize();
        }
        case "radial-in": {
            const referenceBody = getCurrentSOIBody(ship, bodies);
            return ship.position.subtract(referenceBody.position).normalize().scale(-1);
        }
        default:
            throw new Error(`Unhandled burn direction: ${direction}`);

    }

}


export function fuelCostForDeltaV(deltaV: number): number {         // we can have a thrust bar slider that determines deltaV
    return Math.abs(deltaV) * FUEL_BURN_RATE;                     //   not using rocket equation as mass wont matter in space. Implement in future if lauching and landing are added.
}




export function applyBurn( ship: Spacecraft, bodies: CelestialBody[], direction: BurnDirection, deltaV: number ): Spacecraft {
    
    const directionVector = getBurnDirectionVector(ship, bodies, direction);
    const requestedFuelCost = fuelCostForDeltaV(deltaV);

    
    const affordableFuel = Math.min(requestedFuelCost, ship.fuel);       // clamp deltaV if there isn't enough fuel. have to clamp for HUD in BurnControls.tsx as well.
    const actualDeltaV = affordableFuel / FUEL_BURN_RATE;

    const newVelocity = ship.velocity.add(directionVector.scale(actualDeltaV));

    return {...ship,velocity: newVelocity,fuel: ship.fuel - affordableFuel};   // we will return a new spaceCraft object instead of mutating for simplicity.
}
