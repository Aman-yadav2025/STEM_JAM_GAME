//This file is the single source of truth. It holds the simulation state and the player's inputs, keeping them accessible to both the React UI and the R3F canvas.

import { create } from 'zustand';
import type { Spacecraft, BurnDirection } from '../physics/constants'; //[cite: 1]
import type { MovingBody } from '../physics/orbitPath';
import { type EngineSpec, DEFAULT_ENGINE } from '../physics/Rocketequation.ts';
import { Vector3 } from '../physics/vector3'; //[cite: 1]

interface GameState {
  // Physics State
  ship: Spacecraft;
  bodies: MovingBody[];
  engine: EngineSpec;
  time: number;

  // Player Controls
  activeBurnDirection: BurnDirection | null; //[cite: 1]
  throttle: number;

  // Actions
  setShip: (ship: Spacecraft) => void;
  setBodies: (bodies: MovingBody[]) => void;
  setControls: (direction: BurnDirection | null, throttle: number) => void;
  setTime: (t: number) => void;
}

export const useStore = create<GameState>((set) => {
  const sun: MovingBody = {
    name: 'Sun',
    mass: 20000,
    radius: 70,
    position: Vector3.zero(),
    soiRadius: Infinity,
    color: 'yellow',
  };

  const earth: MovingBody = {
    name: 'Earth',
    mass: 10000,
    radius: 35,
    position: new Vector3(300, 0, 0),
    soiRadius: 80,
    color: 'blue',
    orbit: {
      parentBody: sun,
      orbitalRadius: 300,
      orbitalPeriod: 30,
      initialAngle: 0,
    },
  };

  return {
    ship: {
      position: new Vector3(0, 0, 100), //[cite: 1]
      velocity: new Vector3(0, 125, 0),
      mass: 1000,
      fuel: 500,
      maxFuel: 500,
      heading: 0,
    },
    bodies: [sun, earth],
    engine: DEFAULT_ENGINE, //[cite: 1]
    time: 0,
    activeBurnDirection: null,
    throttle: 0,

    setShip: (ship) => set({ ship }),
    setBodies: (bodies) => set({ bodies }),
    setControls: (direction, throttle) => set({ activeBurnDirection: direction, throttle }),
    setTime: (time) => set({ time }),
  };
});