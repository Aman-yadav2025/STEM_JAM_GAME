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
    mass: 2000000,
    radius: 120,
    position: Vector3.zero(),
    soiRadius: Infinity,
    color: 'yellow',
  };

  const earth: MovingBody = {
    name: 'Earth',
    mass: 65000,
    radius: 35,
    position: new Vector3(900, 0, 0),
    soiRadius: 225,
    color: 'blue',
    orbit: {
      parentBody: sun,
      orbitalRadius: 900,
      orbitalPeriod: 70,
      initialAngle: 0,
    },
  };


  const moon: MovingBody = {
    name: 'Moon',
    mass: 2000,
    radius: 8,
    position: new Vector3(975, 0, 0),
    soiRadius: 20,
    color: 'blue',
    orbit: {
      parentBody: earth,
      orbitalRadius: 75,
      orbitalPeriod: 8,
      initialAngle: 0,
    },
  };
  const mercury: MovingBody = {
    name: 'mercury',
    mass: 15000,
    radius: 18,
    position: new Vector3(350, 0, 0),
    soiRadius: 40,
    color: 'blue',
    orbit: {
      parentBody: sun,
      orbitalRadius: 350,
      orbitalPeriod: 25,
      initialAngle: 0,
    },
  };



  return {
    ship: {
      position: new Vector3(850, 0, 0), //[cite: 1]
      velocity: new Vector3(0, 0, 250),
      mass: 1000,
      fuel: 500,
      maxFuel: 500,
      heading: 0,
    },
    bodies: [sun, earth , moon, mercury],
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