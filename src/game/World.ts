//from state import game data or current data and apply physics on them here and then update back both in store and in UI

import { useStore } from '../state/store';
import { updateShipPhysics } from '../physics/rocketMotion'; //[cite: 1]
import { updateBodyPositions } from '../physics/orbitPath'; //[cite: 1]

export class World {
  static tick() {
    // 1. Grab current state from Zustand
    const state = useStore.getState();
    let currentShip = state.ship;
    let currentBodies = [...state.bodies];
    let currentTime = state.time;

    // 2. Update planets/moons first so the ship's gravity reads live positions[cite: 1]
    // Assuming currentBodies implements the MovingBody interface[cite: 1]
    updateBodyPositions(currentBodies as any, currentTime); //[cite: 1]

    // 3. Update ship physics (integrates continuous thrust and dominant-body gravity)[cite: 1]
    const { ship: nextShip, t: nextTime } = updateShipPhysics(
      currentShip,
      currentBodies as any,
      state.engine,
      state.activeBurnDirection,
      state.throttle,
      currentTime
    ); //[cite: 1]

    // 4. Commit the new state back to the store
    useStore.setState({
      ship: nextShip,
      bodies: currentBodies,
      time: nextTime // nextTime usually equals currentTime + CONSTANT_DT[cite: 1]
    });
  }
}