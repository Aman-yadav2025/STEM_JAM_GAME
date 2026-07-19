import { create } from 'zustand';
import type { Spacecraft, BurnDirection } from '../physics/constants';
import type { MovingBody } from '../physics/orbitPath';
import { type EngineSpec, DEFAULT_ENGINE } from '../physics/Rocketequation.ts';
import { Vector3 } from '../physics/vector3';

interface GameState {
  ship: Spacecraft;
  bodies: MovingBody[];
  engine: EngineSpec;
  time: number;

  activeBurnDirection: BurnDirection | null;
  throttle: number;

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

  const mercury: MovingBody = {
    name: 'Mercury',
    mass: 3000,
    radius: 10,
    position: new Vector3(150, 0, 0),
    soiRadius: 25,
    color: '#dd0a0a',
    orbit: {
      parentBody: sun,
      orbitalRadius: 150,
      orbitalPeriod: 12,
      initialAngle: 0,
    },
  };

  const venus: MovingBody = {
    name: 'Venus',
    mass: 8000,
    radius: 22,
    position: new Vector3(0, 220, 0),
    soiRadius: 45,
    color: '#e0b070',
    orbit: {
      parentBody: sun,
      orbitalRadius: 220,
      orbitalPeriod: 20,
      initialAngle: Math.PI / 4,
    },
  };

  const earth: MovingBody = {
    name: 'Earth',
    mass: 10000,
    radius: 35,
    position: new Vector3(320, 0, 0),
    soiRadius: 80,
    color: 'blue',
    orbit: {
      parentBody: sun,
      orbitalRadius: 320,
      orbitalPeriod: 30,
      initialAngle: 0,
    },
  };

  const moon: MovingBody = {
    name: 'Moon',
    mass: 1000,
    radius: 10,
    position: new Vector3(370, 0, 0),
    soiRadius: 20,
    color: '#cccccc',
    orbit: {
      parentBody: earth,
      orbitalRadius: 50, // distance FROM Earth, not from Sun
      orbitalPeriod: 6,
      initialAngle: 0,
    },
  };

  const mars: MovingBody = {
    name: 'Mars',
    mass: 6000,
    radius: 28,
    position: new Vector3(0, 480, 0),
    soiRadius: 60,
    color: '#c1440e',
    orbit: {
      parentBody: sun,
      orbitalRadius: 480,
      orbitalPeriod: 45,
      initialAngle: Math.PI / 2,
    },
  };

  const jupiter: MovingBody = {
    name: 'Jupiter',
    mass: 30000,
    radius: 55,
    position: new Vector3(0, 750, 0),
    soiRadius: 150,
    color: '#d2a679',
    orbit: {
      parentBody: sun,
      orbitalRadius: 750,
      orbitalPeriod: 90,
      initialAngle: Math.PI / 3,
    },
  };

  const uranus: MovingBody = {
    name: 'Uranus',
    mass: 15000,
    radius: 42,
    position: new Vector3(0, -950, 0),
    soiRadius: 110,
    color: '#7fdbdb',
    orbit: {
      parentBody: sun,
      orbitalRadius: 950,
      orbitalPeriod: 150,
      initialAngle: (5 * Math.PI) / 4,
    },
  };

  const neptune: MovingBody = {
    name: 'Neptune',
    mass: 15000,
    radius: 40,
    position: new Vector3(0, -1200, 0),
    soiRadius: 110,
    color: '#3f54ba',
    orbit: {
      parentBody: sun,
      orbitalRadius: 1200,
      orbitalPeriod: 200,
      initialAngle: (3 * Math.PI) / 2,
    },
  };

  return {
    ship: {
      position: new Vector3(0, 0, 100),
      velocity: new Vector3(0, 125, 0),
      mass: 1000,
      fuel: 1000,
      maxFuel: 500,
      heading: 0,
    },
    bodies: [sun, mercury, venus, earth, moon, mars, jupiter, uranus, neptune],
    engine: DEFAULT_ENGINE,
    time: 0,
    activeBurnDirection: null,
    throttle: 0,

    setShip: (ship) => set({ ship }),
    setBodies: (bodies) => set({ bodies }),
    setControls: (direction, throttle) => set({ activeBurnDirection: direction, throttle }),
    setTime: (time) => set({ time }),
  };
});