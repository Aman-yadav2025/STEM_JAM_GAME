//from state import game data or current data and apply physics on them here and then update back both in store and in UI

import { useStore } from '../state/store';
import { updateShipPhysics } from '../physics/rocketMotion';
import { CONSTANT_DT } from '../physics/constants';

export class World {
  static tick(dt = CONSTANT_DT) {
    // 1. Grab current state from Zustand
    const state = useStore.getState();
    if (state.isPaused || state.gamePhase !== 'Playing') return;
    let currentShip = state.ship;
    let currentBodies = [...state.bodies];
    let currentTime = state.time;
    const timeWarp = state.timeWarp ?? 1;
    const totalDt = dt * timeWarp;

    const maxSubDt = 0.02;
    const numSteps = Math.max(1, Math.ceil(totalDt / maxSubDt));
    const subDt = totalDt / numSteps;

    // 2. Update ship physics (integrates continuous thrust and dominant-body
    // gravity). This internally calls updateBodyPositions(bodies, currentTime)
    // as its own first step, so calling it again out here would just be a
    // redundant duplicate — removed to keep body-position updates coming
    // from a single call site.
    for (let i = 0; i < numSteps; i++) {
      const { ship: nextShip, t: nextTime } = updateShipPhysics(
        currentShip,
        currentBodies as any,
        state.engine,
        state.activeBurnDirection,
        state.throttle,
        currentTime,
        subDt,
        state.flightInput
      );

      currentShip = nextShip;
      currentTime = nextTime;
    }

    // 3. Commit the new state back to the store
    useStore.setState({
      ship: currentShip,
      bodies: currentBodies,
      time: currentTime,
    });
  }
}