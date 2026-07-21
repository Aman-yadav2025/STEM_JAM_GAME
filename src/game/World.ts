//from state import game data or current data and apply physics on them here and then update back both in store and in UI

import { useStore } from '../state/store';
import { updateShipPhysics } from '../physics/rocketMotion';
import { showGameCaption } from '../ui/hud/CaptionBox';
import { CONSTANT_DT } from '../physics/constants';

function getCurrentBodyId(ship: { position: { distanceTo: (target: any) => number } }, bodies: Array<{ name: string; soiRadius: number; position: any }>) {
  let currentBodyId: string | null = null;
  let smallestSoI = Infinity;

  bodies.forEach((body) => {
    const distance = ship.position.distanceTo(body.position);
    if (distance < body.soiRadius && body.soiRadius < smallestSoI) {
      smallestSoI = body.soiRadius;
      currentBodyId = body.name;
    }
  });

  return currentBodyId;
}

export class World {
  static tick(dt = CONSTANT_DT) {
    // 1. Grab current state from Zustand
    const state = useStore.getState();
    let currentShip = state.ship;
    let currentBodies = [...state.bodies];
    let currentTime = state.time;

    // 2. Update ship physics (integrates continuous thrust and dominant-body
    // gravity). This internally calls updateBodyPositions(bodies, currentTime)
    // as its own first step, so calling it again out here would just be a
    // redundant duplicate — removed to keep body-position updates coming
    // from a single call site.
    const { ship: nextShip, t: nextTime } = updateShipPhysics(
      currentShip,
      currentBodies as any,
      state.engine,
      state.activeBurnDirection,
      state.throttle,
      currentTime,
      dt
    );

    // 3. Commit the new state back to the store
    useStore.setState({
      ship: nextShip,
      bodies: currentBodies,
      time: nextTime,
    });
  }
}