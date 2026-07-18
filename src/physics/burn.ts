import { type CelestialBody, type Spacecraft, type BurnDirection, totalMass , DefaultEngine} from "./constants";
import { Vector3} from "./vector3";
import { getCurrentSOIBody } from "./gravity";
import { type EngineSpec, propellantForDeltaV, maxDeltaVForPropellant } from "./Rocketequation";


export interface BurnResult{
    success: Boolean;
    reason?: string;
    propellantUsed?: number;
}

export function getBurnDirectionVector(ship: Spacecraft, bodies: CelestialBody[], direction: BurnDirection): Vector3 {
    
    switch (direction) {
        case "prograde":
            return ship.velocity.clone().normalize();
        case "retrograde":
            return ship.velocity.clone().normalize().scale(-1);
        case "radial-out": {
            const referenceBody = getCurrentSOIBody(ship, bodies);
            return ship.position.subtract(referenceBody.position).normalize();
        }
        case "radial-in": {
            const referenceBody = getCurrentSOIBody(ship, bodies);
            return ship.position.subtract(referenceBody.position).normalize().scale(-1);
        }
        case "normal" : {
            const referenceBody = getCurrentSOIBody(ship, bodies);
            return ship.velocity.cross(referenceBody.position.subtract(ship.position)).normalize();
        }
        case "antinormal": {
            const referenceBody = getCurrentSOIBody(ship, bodies);
            return ship.velocity.cross(referenceBody.position.subtract(ship.position)).normalize().scale(-1);
        }
        default:
            throw new Error(`Unhandled burn direction: ${direction}`);

    }

}

export function applyBurn(
  ship: Spacecraft,
  direction: BurnDirection,
  deltaV: number,
  engine: EngineSpec = DefaultEngine,
  bodies : CelestialBody[]
): BurnResult {
  const speed = ship.velocity.magnitude();
  if (speed === 0) {
    return { success: false, reason: 'cannot determine prograde direction at zero velocity' };
  }
 
  const massBefore = totalMass(ship);
  const propellantNeeded = propellantForDeltaV(deltaV, massBefore, engine);
 
  if (propellantNeeded > ship.fuel) {
    return { success: false, reason: 'insufficient fuel' };
  }
 
  const burnUnit = getBurnDirectionVector(ship, bodies,direction);
  ship.velocity = ship.velocity.add(burnUnit.scale(deltaV));
  ship.fuel -= propellantNeeded;
 
  return { success: true, propellantUsed: propellantNeeded };
}

//result of burn for UID
export function previewBurn(
  ship: Spacecraft,
  direction: BurnDirection,
  deltaV: number,
  engine: EngineSpec = DefaultEngine,
  bodies: CelestialBody[]
) {
  const speed = ship.velocity.magnitude();
  if (speed === 0) {
    return { velocity: ship.velocity, propellantUsed: 0, affordable: false };
  }
 
  const massBefore = totalMass(ship);
  const propellantNeeded = propellantForDeltaV(deltaV, massBefore, engine);
  const burnUnit = getBurnDirectionVector(ship, bodies, direction);
  const velocity = ship.velocity.add(burnUnit.scale(deltaV));
 
  return {
    velocity,
    propellantUsed: propellantNeeded,
    affordable: propellantNeeded <= ship.fuel,
  };
}

//return max deltaV
export function maxAvailableDeltaV(
  ship: Spacecraft,
  engine: EngineSpec = DefaultEngine
): number {
  const massBefore = totalMass(ship);
  return maxDeltaVForPropellant(ship.fuel, massBefore, engine);
}
