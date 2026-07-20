import { create } from 'zustand';
import { type Spacecraft, type BurnDirection, G } from '../physics/constants';
import type { MovingBody } from '../physics/orbitPath';
import { type EngineSpec, DEFAULT_ENGINE } from '../physics/Rocketequation.ts';
import { Vector3 } from '../physics/vector3';

export type CodexEntry = {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
};

interface GameState {
  ship: Spacecraft;
  bodies: MovingBody[];
  engine: EngineSpec;
  time: number;

  activeBurnDirection: BurnDirection | null;
  throttle: number;

  isPaused: boolean;
  setPaused: (paused: boolean) => void;
  togglePaused: () => void;

  codexEntries: CodexEntry[];
  unlockCodexEntry: (id: string) => boolean;

  setShip: (ship: Spacecraft) => void;
  setBodies: (bodies: MovingBody[]) => void;
  setControls: (direction: BurnDirection | null, throttle: number) => void;
  setTime: (t: number) => void;
}

 export const useStore = create<GameState>((set, get) => {
  const sun: MovingBody = {
    name: 'Sun',
    mass: 2000000,
    radius: 120,
    position: Vector3.zero(),
    soiRadius: Infinity,
    color: 'yellow',
  };

  const mercury: MovingBody = {
    name: 'Mercury',
    mass: 15000,
    radius: 18,
    position: new Vector3(0, 350, 0),
    soiRadius: 40,
    color: 'gray',
    orbit: {
      parentBody: sun,
      orbitalRadius: 350,
      orbitalPeriod: 25,
      initialAngle: 0,
    },
  };

  const venus: MovingBody = {
    name: 'Venus',
    mass: 55000,
    radius: 30,
    position: new Vector3(0, 600, 0),
    soiRadius: 130,
    color: 'orange',
    orbit: {
      parentBody: sun,
      orbitalRadius: 600,
      orbitalPeriod: 45,
      initialAngle: Math.PI / 4,
    },
  };

  const earth: MovingBody = {
    name: 'Earth',
    mass: 65000,
    radius: 35,
    position: new Vector3(0, 900, 0),
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
    position: new Vector3(0, 975, 0),
    soiRadius: 20,
    color: 'lightgray',
    orbit: {
      parentBody: earth,
      orbitalRadius: 75,
      orbitalPeriod: 8,
      initialAngle: 0,
    },
  };

  const mars: MovingBody = {
    name: 'Mars',
    mass: 35000,
    radius: 24,
    position: new Vector3(0, 1300, 0),
    soiRadius: 160,
    color: 'red',
    orbit: {
      parentBody: sun,
      orbitalRadius: 1300,
      orbitalPeriod: 110,
      initialAngle: Math.PI / 2,
    },
  };

  const jupiter: MovingBody = {
    name: 'Jupiter',
    mass: 280000,
    radius: 65,
    position: new Vector3(0, 1900, 0),
    soiRadius: 380,
    color: 'brown',
    orbit: {
      parentBody: sun,
      orbitalRadius: 1900,
      orbitalPeriod: 200,
      initialAngle: Math.PI,
    },
  };

  const saturn: MovingBody = {
    name: 'Saturn',
    mass: 180000,
    radius: 52,
    position: new Vector3(0, 2600, 0),
    soiRadius: 320,
    color: 'khaki',
    orbit: {
      parentBody: sun,
      orbitalRadius: 2600,
      orbitalPeriod: 320,
      initialAngle: Math.PI * 1.2,
    },
  };

  const uranus: MovingBody = {
    name: 'Uranus',
    mass: 90000,
    radius: 40,
    position: new Vector3(0, 3300, 0),
    soiRadius: 260,
    color: 'lightblue',
    orbit: {
      parentBody: sun,
      orbitalRadius: 3300,
      orbitalPeriod: 460,
      initialAngle: Math.PI * 1.5,
    },
  };

  const neptune: MovingBody = {
    name: 'Neptune',
    mass: 95000,
    radius: 38,
    position: new Vector3(0, 4000, 0),
    soiRadius: 280,
    color: 'darkblue',
    orbit: {
      parentBody: sun,
      orbitalRadius: 4000,
      orbitalPeriod: 600,
      initialAngle: Math.PI * 1.8,
    },
  };

  const initialCodexEntries: CodexEntry[] = [
    {
      id: 'Earth',
      title: 'Earth — The Blue Beacon',
      description:
        'Low Earth orbit is your home field. Learn to time burns against the planet and exploit its gravity well for efficient transfer windows.',
      unlocked: true,
    },
    {
      id: 'Moon',
      title: 'Moon — Silent Sentinel',
      description:
        'The Moon is tidally locked to Earth. Its quiet gravity makes it an ideal staging ground for refueling and precise orbital insertions.',
      unlocked: false,
    },
    {
      id: 'Mercury',
      title: 'Mercury — Cratered Messenger',
      description:
        'Mercury orbits fast and close to the Sun. Short transfer windows mean burns must be sharp, but low gravity makes capture cheaper.',
      unlocked: false,
    },
    {
      id: 'Venus',
      title: 'Venus — Pressure Cooker',
      description:
        'Venus is dominated by dense atmosphere and heat. Avoid low passes unless you are prepared for strong aerodynamic drag and sensor stress.',
      unlocked: false,
    },
    {
      id: 'Mars',
      title: 'Mars — Red Frontier',
      description:
        'Mars has a thinner atmosphere and gentler gravity. Capturing there is forgiving, but accurate phase angles are essential for rendezvous.',
      unlocked: false,
    },
    {
      id: 'Jupiter',
      title: 'Jupiter — Gas Giant',
      description:
        'Jupiter offers powerful gravity assists at the cost of intense radiation and debris. Use its pull to boost your trajectory and conserve fuel.',
      unlocked: false,
    },
    {
      id: 'Saturn',
      title: 'Saturn — Ringed Giant',
      description:
        'Saturn’s rings are beautiful and dangerous. The system’s wide SOI makes long-distance planning important for safe entry and exit.',
      unlocked: false,
    },
    {
      id: 'Uranus',
      title: 'Uranus — Tilted Ice World',
      description:
        'Uranus rotates on its side. Orbital paths through its system feel skewed, and navigation relies on steady, patient burns.',
      unlocked: false,
    },
    {
      id: 'Neptune',
      title: 'Neptune — Deep Blue',
      description:
        'Neptune is a distant ice giant. Its remote SOI rewards accurate planning, and sunlight is weak once you drift into the outer system.',
      unlocked: false,
    },
  ];

  return {
    ship: {
      position: new Vector3(earth.position.x, earth.position.y+100,earth.position.z), //[cite: 1]
      velocity: new Vector3(Math.sqrt(G * earth.mass / 100 ),0, 0),
      mass: 1000,
      fuel: 500,
      maxFuel: 500,
      heading: 0,
    },
    bodies: [sun, earth , moon, mercury, venus, mars, jupiter, saturn, uranus, neptune],
    engine: DEFAULT_ENGINE, //[cite: 1]
    time: 0,
    activeBurnDirection: null,
    throttle: 0,

    isPaused: false,
    setPaused: (paused) => set({ isPaused: paused }),
    togglePaused: () => set((state) => ({ isPaused: !state.isPaused })),
    codexEntries: initialCodexEntries,
    unlockCodexEntry: (id) => {
      const state = get();
      const entry = state.codexEntries.find((codex) => codex.id === id);
      if (!entry || entry.unlocked) {
        return false;
      }

      set({
        codexEntries: state.codexEntries.map((codex) =>
          codex.id === id ? { ...codex, unlocked: true } : codex
        ),
      });
      return true;
    },
    setShip: (ship) => set({ ship }),
    setBodies: (bodies) => set({ bodies }),
    setControls: (direction, throttle) => set({ activeBurnDirection: direction, throttle }),
    setTime: (time) => set({ time }),
  };
});

