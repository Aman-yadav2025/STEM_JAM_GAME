import { create } from 'zustand';
import { type Spacecraft, type BurnDirection, G } from '../physics/constants';
import type { MovingBody } from '../physics/orbitPath';
import { type EngineSpec, DEFAULT_ENGINE } from '../physics/Rocketequation.ts';
import { Vector3 } from '../physics/vector3';
import { buildSolarSystem } from '../scene/celestialFactory';


export const WARP_STEPS = [1, 2, 5, 10, 25, 50, 75, 100] as const;
export type WarpStep = (typeof WARP_STEPS)[number];


export type CodexEntry = {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  scanned: boolean;
  scanProgress: number;
};

export type Achievement = {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress: number;
  target: number;
  category: 'efficiency' | 'risk';
};

interface GameState {
  ship: Spacecraft;
  bodies: MovingBody[];
  engine: EngineSpec;
  time: number;

  timeWarp: WarpStep;
  setTimeWarp: (warp: WarpStep) => void;
  increaseTimeWarp: () => void;
  decreaseTimeWarp: () => void;
  resetTimeWarp: () => void;

  activeBurnDirection: BurnDirection | null;
  throttle: number;

  gamePhase: 'menu' | 'Playing' | 'GameOver';
  setGamePhase: (phase: 'menu' | 'Playing' | 'GameOver') => void;
  returnToMainMenu: (save?: boolean) => void;

  isPaused: boolean;

  setPaused: (paused: boolean) => void;
  togglePaused: () => void;

  codexEntries: CodexEntry[];
  achievements: Achievement[];
  activeScanTargetId: string | null;
  scanProgress: number;
  currentBodyId: string | null;
  ringGrazingTime: number;
  aerobrakeTime: number;
  unlockCodexEntry: (id: string) => boolean;
  startCodexScan: (id: string) => void;
  updateCodexScanProgress: (progress: number) => void;
  completeCodexScan: (id: string) => boolean;
  resetCodexScan: () => void;
  unlockAchievement: (id: string) => boolean;
  updateAchievementProgress: (id: string, progress: number) => void;

  setShip: (ship: Spacecraft) => void;
  setBodies: (bodies: MovingBody[]) => void;
  setControls: (direction: BurnDirection | null, throttle: number) => void;
  setTime: (t: number) => void;

  // --- Save / Continue / New Game ---
  hasSave: boolean;
  saveGame: () => void;
  startNewGame: () => void;
  continueGame: () => void;
  clearSave: () => void;
}

// ---- Save system -----------------------------------------------------
const SAVE_KEY = 'orbit-simulator-save-v1';

type SerializedVector3 = { x: number; y: number; z: number };

type SaveData = {
  ship: Omit<Spacecraft, 'position' | 'velocity'> & {
    position: SerializedVector3;
    velocity: SerializedVector3;
  };
  engine: EngineSpec;
  time: number;
  codexEntries: CodexEntry[];
  achievements: Achievement[];
};

const serializeVector3 = (v: Vector3): SerializedVector3 => ({ x: v.x, y: v.y, z: v.z });
const deserializeVector3 = (v: SerializedVector3): Vector3 => new Vector3(v.x, v.y, v.z);

const hasLocalStorage = () => typeof window !== 'undefined' && !!window.localStorage;

const readSave = (): SaveData | null => {
  if (!hasLocalStorage()) return null;
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SaveData;
  } catch {
    return null;
  }
};

const writeSave = (data: SaveData) => {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Storage full/unavailable
  }
};

const deleteSave = () => {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
};



// ---- DYNAMIC CELESTIAL SYSTEM GENERATION ----------------------------
// NOTE: mass is intentionally NOT specified for planets/moons below.
// Leaving it out lets celestialFactory.ts compute mass from radius^3 * density,
// so mass scales consistently with size instead of being arbitrary hand-picked
// numbers that don't track volume (which was also throwing off the Hill-sphere
// SOI calculations). Sun mass is still explicit since it's the fixed reference body.
const initialBodies = buildSolarSystem(
  // Central Sun
  { name: 'Sun', mass: 27192370, radius: 140, color: 'yellow' },

  // Planetary Systems
  [
    {
      name: 'Mercury',
      radius: 18,
      sunDistance: 550,
      orbitalPeriod: 25,
      color: 'gray',
      initialAngle: 0,
    },
    {
      name: 'Venus',
      radius: 30,
      sunDistance: 950,
      orbitalPeriod: 45,
      color: 'orange',
      initialAngle: Math.PI / 4,
    },
    {
      name: 'Earth',
      radius: 35,
      sunDistance: 1500,
      orbitalPeriod: 70,
      color: 'blue',
      initialAngle: 0,
      moons: [
        { name: 'Moon', radius: 8, color: 'lightgray', orbitalPeriod: 12 },
      ],
    },
    {
      name: 'Mars',
      radius: 24,
      sunDistance: 2200,
      orbitalPeriod: 110,
      color: 'red',
      initialAngle: Math.PI / 2,
      moons: [
        { name: 'Phobos', radius: 3, color: 'gray', orbitalPeriod: 3 },
        { name: 'Deimos', radius: 2, color: 'gray', orbitalPeriod: 6, initialAngle: 2.5 },
      ],
    },
    {
      name: 'Jupiter',
      radius: 65,
      sunDistance: 3400,
      orbitalPeriod: 200,
      color: 'brown',
      density: 0.8, // gas giant — lighter per unit volume than rocky planets
      initialAngle: Math.PI,
      moons: [
        { name: 'Amalthea', radius: 2, color: 'red', orbitalPeriod: 3 },
        { name: 'Io', radius: 6, color: 'yellow', orbitalPeriod: 5 },
        { name: 'Europa', radius: 5, color: 'white', orbitalPeriod: 8 },
        { name: 'Ganymede', radius: 8, color: 'gray', orbitalPeriod: 14 },
        { name: 'Callisto', radius: 7, color: 'darkgray', orbitalPeriod: 22 },
        { name: 'Himalia', radius: 2, color: 'gray', orbitalPeriod: 40 },
        { name: 'Elara', radius: 2, color: 'gray', orbitalPeriod: 45 },
        { name: 'Pasiphae', radius: 1, color: 'darkgray', orbitalPeriod: 60 },
        { name: 'Sinope', radius: 1, color: 'darkgray', orbitalPeriod: 65 },
        { name: 'Carme', radius: 1, color: 'darkgray', orbitalPeriod: 70 },
      ],
    },
    {
      name: 'Saturn',
      radius: 52,
      sunDistance: 4800,
      orbitalPeriod: 320,
      color: 'khaki',
      density: 0.6, // least dense gas giant
      initialAngle: Math.PI * 1.2,
      moons: [
        { name: 'Atlas', radius: 1, color: 'gray', orbitalPeriod: 4 },
        { name: 'Janus', radius: 1, color: 'gray', orbitalPeriod: 5 },
        { name: 'Epimetheus', radius: 1, color: 'gray', orbitalPeriod: 5 },
        { name: 'Mimas', radius: 2, color: 'lightgray', orbitalPeriod: 7 },
        { name: 'Enceladus', radius: 3, color: 'white', orbitalPeriod: 9 },
        { name: 'Tethys', radius: 3, color: 'lightgray', orbitalPeriod: 11 },
        { name: 'Telesto', radius: 1, color: 'gray', orbitalPeriod: 11 },
        { name: 'Calypso', radius: 1, color: 'gray', orbitalPeriod: 11 },
        { name: 'Dione', radius: 4, color: 'lightgray', orbitalPeriod: 14 },
        { name: 'Helene', radius: 1, color: 'gray', orbitalPeriod: 14 },
        { name: 'Rhea', radius: 5, color: 'lightgray', orbitalPeriod: 18 },
        { name: 'Titan', radius: 9, color: 'orange', orbitalPeriod: 30 },
        { name: 'Hyperion', radius: 2, color: 'tan', orbitalPeriod: 35 },
        { name: 'Iapetus', radius: 4, color: 'brown', orbitalPeriod: 55 },
        { name: 'Phoebe', radius: 2, color: 'darkgray', orbitalPeriod: 90 },
      ],
    },
    {
      name: 'Uranus',
      radius: 40,
      sunDistance: 6200,
      orbitalPeriod: 460,
      color: 'lightblue',
      density: 0.9, // ice giant
      initialAngle: Math.PI * 1.5,
      moons: [
        { name: 'Miranda', radius: 2, color: 'lightgray', orbitalPeriod: 6 },
        { name: 'Ariel', radius: 3, color: 'lightblue', orbitalPeriod: 10 },
        { name: 'Umbriel', radius: 3, color: 'gray', orbitalPeriod: 14 },
        { name: 'Titania', radius: 5, color: 'tan', orbitalPeriod: 22 },
        { name: 'Oberon', radius: 5, color: 'gray', orbitalPeriod: 30 },
      ],
    },
    {
      name: 'Neptune',
      radius: 38,
      sunDistance: 7500,
      orbitalPeriod: 600,
      color: 'darkblue',
      density: 1.1, // ice giant, slightly denser than Uranus
      initialAngle: Math.PI * 1.8,
      moons: [
        { name: 'Larissa', radius: 2, color: 'gray', orbitalPeriod: 5 },
        { name: 'Proteus', radius: 3, color: 'darkgray', orbitalPeriod: 10 },
        { name: 'Triton', radius: 6, color: 'lightblue', orbitalPeriod: 20 },
        { name: 'Nereid', radius: 2, color: 'gray', orbitalPeriod: 45 },
      ],
    },
    {
      name: 'Pluto',
      radius: 6,
      sunDistance: 8600,
      orbitalPeriod: 740,
      color: 'tan',
      initialAngle: Math.PI * 0.6,
    },
  ]
);

const createInitialShip = (bodies: MovingBody[] = initialBodies): Spacecraft => {
  const earth = bodies.find((b) => b.name === 'Earth');

  if (!earth) {
    return {
      position: new Vector3(1500, 0, 0),
      velocity: new Vector3(0, 0, 135),
      mass: 1000,
      fuel: 500,
      maxFuel: 500,
      heading: Math.PI / 2,
    };
  }

  // 1. Calculate Earth's heliocentric velocity vector at t = 0.
  // IMPORTANT: this must match the XZ orbital plane used by
  // orbitPath.ts's bodyPositionAtTime() (Y is up, sin(angle) goes into Z),
  // since that function is what actually moves Earth every frame. For a
  // position (x, y, z) on that circular path, the tangential velocity is
  // (-omega*z, 0, omega*x) — NOT (-omega*y, omega*x, 0), which was the
  // previous (wrong) XY-plane formula and is what caused the ship to fly
  // out of Earth's SOI and end up orbiting the Sun instead.
  let earthVelocity = Vector3.zero();
  if (earth.orbit) {
    const { orbitalPeriod } = earth.orbit;
    const omega = (2 * Math.PI) / orbitalPeriod;

    earthVelocity = new Vector3(
      -omega * earth.position.z,
      0,
      omega * earth.position.x
    );
  }

  // 2. Position ship in Low Earth Orbit (12 units above Earth's surface),
  // offset along +X relative to Earth.
  const orbitAltitude = 12;
  const orbitRadius = earth.radius + orbitAltitude; // 35 + 12 = 47 units from Earth center

  const relativePosition = new Vector3(orbitRadius, 0, 0);
  const shipPosition = earth.position.add(relativePosition);

  // 3. Calculate circular orbital speed relative to Earth: v = sqrt(G * M / r).
  // Uses the real simulation G imported from physics/constants (G = 6) —
  // there is no local shadowing `const G = 1;` here anymore.
  const circularSpeed = Math.sqrt((G * earth.mass) / orbitRadius);

  // Tangential direction for a ship offset along +X in the XZ orbital
  // plane is +Z (matching Earth's own plane of motion), not +Y.
  const relativeVelocity = new Vector3(0, 0, circularSpeed);

  // 4. Combine Earth's velocity with the ship's relative orbital velocity.
  const totalVelocity = earthVelocity.add(relativeVelocity);

  return {
    position:  new Vector3(0,1000,0), //shipPosition,
    velocity: new Vector3(40,100,400),
    mass: 1000,
    fuel: 500,
    maxFuel: 500,
    heading: Math.atan2(totalVelocity.z, totalVelocity.x),
  };
};

export const useStore = create<GameState>((set, get) => {
  const createInitialCodexEntries = (): CodexEntry[] => [
    {
      id: 'Earth',
      title: 'Earth — The Blue Beacon',
      description:
        'Low Earth orbit is your home field. Learn to time burns against the planet and exploit its gravity well for efficient transfer windows.',
      unlocked: true,
      scanned: true,
      scanProgress: 100,
    },
    {
      id: 'Moon',
      title: 'Moon — Silent Sentinel',
      description:
        'The Moon is tidally locked to Earth. Its quiet gravity makes it an ideal staging ground for refueling and precise orbital insertions.',
      unlocked: false,
      scanned: false,
      scanProgress: 0,
    },
    {
      id: 'Mercury',
      title: 'Mercury — Cratered Messenger',
      description:
        'Mercury orbits fast and close to the Sun. Short transfer windows mean burns must be sharp, but low gravity makes capture cheaper.',
      unlocked: false,
      scanned: false,
      scanProgress: 0,
    },
    {
      id: 'Venus',
      title: 'Venus — Pressure Cooker',
      description:
        'Venus is dominated by dense atmosphere and heat. Avoid low passes unless you are prepared for strong aerodynamic drag and sensor stress.',
      unlocked: false,
      scanned: false,
      scanProgress: 0,
    },
    {
      id: 'Mars',
      title: 'Mars — Red Frontier',
      description:
        'Mars has a thinner atmosphere and gentler gravity. Capturing there is forgiving, but accurate phase angles are essential for rendezvous.',
      unlocked: false,
      scanned: false,
      scanProgress: 0,
    },
    {
      id: 'Jupiter',
      title: 'Jupiter — Gas Giant',
      description:
        'Jupiter offers powerful gravity assists at the cost of intense radiation and debris. Use its pull to boost your trajectory and conserve fuel.',
      unlocked: false,
      scanned: false,
      scanProgress: 0,
    },
    {
      id: 'Saturn',
      title: 'Saturn — Ringed Giant',
      description:
        'Saturn’s rings are beautiful and dangerous. The system’s wide SOI makes long-distance planning important for safe entry and exit.',
      unlocked: false,
      scanned: false,
      scanProgress: 0,
    },
    {
      id: 'Uranus',
      title: 'Uranus — Tilted Ice World',
      description:
        'Uranus rotates on its side. Orbital paths through its system feel skewed, and navigation relies on steady, patient burns.',
      unlocked: false,
      scanned: false,
      scanProgress: 0,
    },
    {
      id: 'Neptune',
      title: 'Neptune — Deep Blue',
      description:
        'Neptune is a distant ice giant. Its remote SOI rewards accurate planning, and sunlight is weak once you drift into the outer system.',
      unlocked: false,
      scanned: false,
      scanProgress: 0,
    },
    {
      id: 'Pluto',
      title: 'Pluto — The Frozen Edge',
      description:
        'Pluto sits far beyond Neptune on a long, slow orbit. Its tiny SOI leaves almost no room for error on approach, but escape is cheap.',
      unlocked: false,
      scanned: false,
      scanProgress: 0,
    },
  ];

  const createInitialAchievements = (): Achievement[] => [
    {
      id: 'efficient-transfer',
      title: 'Efficiency',
      description: 'Reach a new destination using minimal propellant from the previous waypoint.',
      unlocked: false,
      progress: 0,
      target: 100,
      category: 'efficiency',
    },
    {
      id: 'ring-grazer',
      title: 'Ring Runner',
      description: 'Hold a steady line through Saturn\'s rings to prove your nerve.',
      unlocked: false,
      progress: 0,
      target: 100,
      category: 'risk',
    },
    {
      id: 'aerobrake-specialist',
      title: 'Aerobrake Specialist',
      description: 'Skim a gas giant\'s upper atmosphere to shed velocity and survive the pass.',
      unlocked: false,
      progress: 0,
      target: 100,
      category: 'risk',
    },
  ];

  return {
    ship: createInitialShip(initialBodies),
    bodies: initialBodies,
    engine: DEFAULT_ENGINE,
    time: 0,

    timeWarp: 1,

    setTimeWarp: (warp) => set({ timeWarp: warp }),

    increaseTimeWarp: () => {
      const current = get().timeWarp;
      const currentIndex = WARP_STEPS.indexOf(current);
      if (currentIndex < WARP_STEPS.length - 1) {
        set({ timeWarp: WARP_STEPS[currentIndex + 1] });
      }
    },

    decreaseTimeWarp: () => {
      const current = get().timeWarp;
      const currentIndex = WARP_STEPS.indexOf(current);
      if (currentIndex > 0) {
        set({ timeWarp: WARP_STEPS[currentIndex - 1] });
      }
    },

    resetTimeWarp: () => set({ timeWarp: 1 }),
    activeBurnDirection: null,
    throttle: 0,

    gamePhase: 'menu',
    setGamePhase: (phase) => set({ gamePhase: phase }),

    isPaused: false,
    setPaused: (paused) => set({ isPaused: paused }),
    togglePaused: () => set((state) => ({ isPaused: !state.isPaused })),
    codexEntries: createInitialCodexEntries(),
    achievements: createInitialAchievements(),
    activeScanTargetId: null,
    scanProgress: 0,
    currentBodyId: null,
    ringGrazingTime: 0,
    aerobrakeTime: 0,
    unlockCodexEntry: (id) => {
      const state = get();
      const entry = state.codexEntries.find((codex) => codex.id === id);
      if (!entry || entry.unlocked) {
        return false;
      }

      set({
        codexEntries: state.codexEntries.map((codex) =>
          codex.id === id ? { ...codex, unlocked: true, scanned: true, scanProgress: 100 } : codex
        ),
        activeScanTargetId: null,
        scanProgress: 0,
      });
      return true;
    },
    startCodexScan: (id) => {
      const state = get();
      const entry = state.codexEntries.find((codex) => codex.id === id);
      if (!entry || entry.unlocked) {
        return;
      }

      set({ activeScanTargetId: id, scanProgress: 0 });
    },
    updateCodexScanProgress: (progress) => set({ scanProgress: Math.max(0, Math.min(100, progress)) }),
    completeCodexScan: (id) => {
      const state = get();
      const entry = state.codexEntries.find((codex) => codex.id === id);
      if (!entry || entry.unlocked) {
        return false;
      }

      set({
        codexEntries: state.codexEntries.map((codex) =>
          codex.id === id ? { ...codex, unlocked: true, scanned: true, scanProgress: 100 } : codex
        ),
        activeScanTargetId: null,
        scanProgress: 0,
      });
      return true;
    },
    resetCodexScan: () => set({ activeScanTargetId: null, scanProgress: 0 }),
    unlockAchievement: (id) => {
      const state = get();
      const achievement = state.achievements.find((entry) => entry.id === id);
      if (!achievement || achievement.unlocked) {
        return false;
      }

      set({
        achievements: state.achievements.map((entry) =>
          entry.id === id ? { ...entry, unlocked: true, progress: 100 } : entry
        ),
      });
      return true;
    },
    updateAchievementProgress: (id, progress) => {
      const state = get();
      const achievement = state.achievements.find((entry) => entry.id === id);
      if (!achievement || achievement.unlocked) {
        return;
      }

      set({
        achievements: state.achievements.map((entry) =>
          entry.id === id ? { ...entry, progress: Math.min(100, Math.max(0, progress)) } : entry
        ),
      });
    },

    setShip: (ship) => set({ ship }),
    setBodies: (bodies) => set({ bodies }),
    setControls: (direction, throttle) => set({ activeBurnDirection: direction, throttle }),
    setTime: (time) => set({ time }),

    // --- Save / Continue / New Game -------------------------------
    hasSave: readSave() !== null,

    saveGame: () => {
      const state = get();
      const data: SaveData = {
        ship: {
          ...state.ship,
          position: serializeVector3(state.ship.position),
          velocity: serializeVector3(state.ship.velocity),
        },
        engine: state.engine,
        time: state.time,
        codexEntries: state.codexEntries,
        achievements: state.achievements,
      };
      writeSave(data);
      set({ hasSave: true });
    },

    returnToMainMenu: (save = true) => {
      if (save) {
        get().saveGame();
      }
      set({
        gamePhase: 'menu',
        activeBurnDirection: null,
        throttle: 0,
        isPaused: true,
        activeScanTargetId: null,
      });
    },

    startNewGame: () => {
      deleteSave();
      set({
        ship: createInitialShip(initialBodies),
        bodies: initialBodies, // Reset celestial bodies to initial system state
        engine: DEFAULT_ENGINE,
        time: 0,
        activeBurnDirection: null,
        throttle: 0,
        codexEntries: createInitialCodexEntries(),
        achievements: createInitialAchievements(),
        activeScanTargetId: null,
        scanProgress: 0,
        currentBodyId: null,
        ringGrazingTime: 0,
        aerobrakeTime: 0,
        isPaused: false,
        gamePhase: 'Playing',
      });
      get().saveGame();
    },
    continueGame: () => {
      const data = readSave();
      if (!data) {
        get().startNewGame();
        return;
      }

      set({
        ship: {
          ...data.ship,
          position: deserializeVector3(data.ship.position),
          velocity: deserializeVector3(data.ship.velocity),
        },
        engine: data.engine,
        time: data.time,
        codexEntries: data.codexEntries,
        achievements: data.achievements,
        activeBurnDirection: null,
        throttle: 0,
        activeScanTargetId: null,
        scanProgress: 0,
        isPaused: false,
        gamePhase: 'Playing',
      });
    },

    clearSave: () => {
      deleteSave();
      set({ hasSave: false });
    },
  };
});