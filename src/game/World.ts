//from state import game data or current data and apply physics on them here and then update back both in store and in UI

import { useStore } from '../state/store';
import { updateShipPhysics } from '../physics/rocketMotion';
import { computeAutopilot } from '../physics/autopilot';
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

    // Manual controls, used as-is unless autopilot is flying this tick.
    let burnDirection = state.activeBurnDirection;
    let throttle = state.throttle;
    let latestAutopilotStatus = state.autopilotStatus;

    // 2. Update ship physics (integrates continuous thrust and dominant-body
    // gravity). This internally calls updateBodyPositions(bodies, currentTime)
    // as its own first step, so calling it again out here would just be a
    // redundant duplicate — removed to keep body-position updates coming
    // from a single call site.
    for (let i = 0; i < numSteps; i++) {
      // Re-evaluate the autopilot every substep, not once per tick — bodies
      // (and the ship) move within the substep loop via the mutation inside
      // updateShipPhysics/updateBodyPositions, and at high time-warp a
      // single World.tick() can span many substeps. Re-computing each
      // substep keeps the burn direction/throttle from going stale across
      // that span, same as a player's manual input would only ever cover
      // one substep's worth of "current" state at a time.
      if (state.autopilotEnabled && state.autopilotTargetName) {
        const autopilotOutput = computeAutopilot(
          currentShip,
          currentBodies as any,
          state.autopilotTargetName
        );
        burnDirection = autopilotOutput.direction;
        throttle = autopilotOutput.throttle;
        latestAutopilotStatus = autopilotOutput.status;

        // Mirror autopilot outputs into the (hidden) active controls so
        // other systems that expect `activeBurnDirection`/`throttle`
        // reflect the autopilot state. These controls are not exposed in
        // the UI anymore but are kept for autopilot compatibility.
        try {
          state.setControls(autopilotOutput.direction, autopilotOutput.throttle);
        } catch (e) {
          // Defensive: ignore failures to avoid crashing the tick loop.
        }
      }

      const { ship: nextShip, t: nextTime } = updateShipPhysics(
        currentShip,
        currentBodies as any,
        state.engine,
        burnDirection,
        throttle,
        currentTime,
        subDt,
        state.flightInput
      );

      currentShip = nextShip;
      currentTime = nextTime;
    }

    // 3. Commit the new state back to the store. Manual activeBurnDirection/
    // throttle in the store are left untouched here — they're the player's
    // held-input state, not the autopilot's per-substep output, so autopilot
    // can be switched off mid-flight and manual controls resume from
    // whatever the player is currently holding, with no stale autopilot
    // burn left active.
    useStore.setState({
      ship: currentShip,
      bodies: currentBodies,
      time: currentTime,
      ...(state.autopilotEnabled ? { autopilotStatus: latestAutopilotStatus } : {}),
    });
  }
}