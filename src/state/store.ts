import { create } from 'zustand';
import { calculateFastTravelState } from '../physics/fastTravel';
import { 
  type Spacecraft, 
  type BurnDirection, 
  type FlightInputState, 
  G 
} from '../physics/constants';
import { type MovingBody, bodyVelocityAtTime } from '../physics/orbitPath';
import { type EngineSpec, DEFAULT_ENGINE } from '../physics/Rocketequation';
import { Vector3 } from '../physics/vector3';
import { buildSolarSystem } from '../scene/celestialFactory';
import type { AutopilotStatus } from '../physics/autopilot';


export const WARP_STEPS = [0.01, 0.05, 0.1, 0.2, 0.5,0,1, 2, 5, 10, 25, 50, 75, 100] as const;
export type WarpStep = (typeof WARP_STEPS)[number];

export const DEFAULT_WARP_STEP: WarpStep = WARP_STEPS[2];

export const getDisplayWarpValue = (step: WarpStep): number => Number((step * 10).toFixed(10));


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
  cancelAutopilot: () => void;
  ship: Spacecraft;
  bodies: MovingBody[];
  engine: EngineSpec;
  time: number;
  trajectoryPath: Vector3[];

  timeWarp: WarpStep;
  setTimeWarp: (warp: WarpStep) => void;
  increaseTimeWarp: () => void;
  decreaseTimeWarp: () => void;
  resetTimeWarp: () => void;

  activeBurnDirection: BurnDirection | null;
  throttle: number;

  // --- Autopilot ---
  // When enabled, World.tick() feeds computeAutopilot()'s output into
  // updateShipPhysics() instead of the player's manual activeBurnDirection/
  // throttle. Manual controls remain untouched underneath so toggling
  // autopilot off hands control straight back with no extra plumbing.
  autopilotEnabled: boolean;
  autopilotTargetName: string | null;
  autopilotStatus: AutopilotStatus;
  setAutopilotTarget: (targetName: string | null) => void;
  setAutopilotEnabled: (enabled: boolean) => void;
  toggleAutopilot: () => void;

  gamePhase: 'menu' | 'Playing' | 'GameOver';
  setGamePhase: (phase: 'menu' | 'Playing' | 'GameOver') => void;
  returnToMainMenu: (save?: boolean) => void;

  flightInput: FlightInputState;
  setFlightControls: (controls: FlightInputState) => void;

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
  setTrajectoryPath: (path: Vector3[]) => void;

  // --- Save / Continue / New Game ---
  hasSave: boolean;
  saveGame: () => void;
  startNewGame: () => void;
  continueGame: () => void;
  clearSave: () => void;
  fastTravelToTarget: (targetName: string) => void;
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
      color: 'gray',
      initialAngle: 0,
    },
    {
      name: 'Venus',
      radius: 30,
      sunDistance: 950,
      color: 'orange',
      initialAngle: Math.PI / 4,
    },
    {
      name: 'Earth',
      radius: 35,
      sunDistance: 1500,
      color: 'blue',
      initialAngle: 0,
      moons: [
        { name: 'Moon', radius: 8, color: 'lightgray'},
      ],
    },
    {
      name: 'Mars',
      radius: 24,
      sunDistance: 2200,
      color: 'red',
      initialAngle: Math.PI / 2,
      moons: [
        { name: 'Phobos', radius: 3, color: 'gray' },
        { name: 'Deimos', radius: 2, color: 'gray', initialAngle: 2.5 },
      ],
    },
    {
      name: 'Jupiter',
      radius: 65,
      sunDistance: 3400,
      color: 'brown',
      density: 0.8, // gas giant — lighter per unit volume than rocky planets
      initialAngle: Math.PI,
      moons: [
        { name: 'Amalthea', radius: 2, color: 'red'},
        { name: 'Io', radius: 6, color: 'yellow'},
        { name: 'Europa', radius: 5, color: 'white'},
        { name: 'Ganymede', radius: 8, color: 'gray'},
        { name: 'Callisto', radius: 7, color: 'darkgray'},
        { name: 'Himalia', radius: 2, color: 'gray'},
        { name: 'Elara', radius: 2, color: 'gray'},
        { name: 'Pasiphae', radius: 1, color: 'darkgray'},
        { name: 'Sinope', radius: 1, color: 'darkgray'},
        { name: 'Carme', radius: 1, color: 'darkgray'},
      ],
    },
    {
      name: 'Saturn',
      radius: 52,
      sunDistance: 4800,
      color: 'khaki',
      density: 0.6, // least dense gas giant
      initialAngle: Math.PI * 1.2,
      moons: [
        { name: 'Atlas', radius: 1, color: 'gray'},
        { name: 'Janus', radius: 1, color: 'gray'},
        { name: 'Epimetheus', radius: 1, color: 'gray'},
        { name: 'Mimas', radius: 2, color: 'lightgray'},
        { name: 'Enceladus', radius: 3, color: 'white'},
        { name: 'Tethys', radius: 3, color: 'lightgray',},
        { name: 'Telesto', radius: 1, color: 'gray',},
        { name: 'Calypso', radius: 1, color: 'gray',},
        { name: 'Dione', radius: 4, color: 'lightgray',},
        { name: 'Helene', radius: 1, color: 'gray',},
        { name: 'Rhea', radius: 5, color: 'lightgray',},
        { name: 'Titan', radius: 9, color: 'orange',},
        { name: 'Hyperion', radius: 2, color: 'tan',},
        { name: 'Iapetus', radius: 4, color: 'brown',},
        { name: 'Phoebe', radius: 2, color: 'darkgray',},
      ],
    },
    {
      name: 'Uranus',
      radius: 40,
      sunDistance: 6200,
      color: 'lightblue',
      density: 0.9, // ice giant
      initialAngle: Math.PI * 1.5,
      moons: [
        { name: 'Miranda', radius: 2, color: 'lightgray'},
        { name: 'Ariel', radius: 3, color: 'lightblue',},
        { name: 'Umbriel', radius: 3, color: 'gray',},
        { name: 'Titania', radius: 5, color: 'tan',},
        { name: 'Oberon', radius: 5, color: 'gray',},
      ],
    },
    {
      name: 'Neptune',
      radius: 38,
      sunDistance: 7500,
      color: 'darkblue',
      density: 1.1, // ice giant, slightly denser than Uranus
      initialAngle: Math.PI * 1.8,
      moons: [
        { name: 'Larissa', radius: 2, color: 'gray'},
        { name: 'Proteus', radius: 3, color: 'darkgray'},
        { name: 'Triton', radius: 6, color: 'lightblue'},
        { name: 'Nereid', radius: 2, color: 'gray'},
      ],
    },
    {
      name: 'Pluto',
      radius: 6,
      sunDistance: 8600,
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
      pitch: 0,
      yaw: 0,
      roll: 0,
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
    earthVelocity = bodyVelocityAtTime(earth.orbit, 0);
  }

  // 2. Position ship in Low Earth Orbit (12 units above Earth's surface),
  // offset along +X relative to Earth.
  const orbitAltitude = 70;
  const orbitRadius = earth.radius + orbitAltitude; // 35 + 12 = 47 units from Earth center

  const earthParent = earth.orbit?.parentBody?.position ?? Vector3.zero();
  const earthRadial = earth.position.subtract(earthParent).normalize();
  const relativePosition = earthRadial.scale(orbitRadius);
  const shipPosition = earth.position.add(relativePosition);

  // 3. Calculate circular orbital speed relative to Earth: v = sqrt(G * M / r).
  const circularSpeed = Math.sqrt((G * earth.mass) / orbitRadius);

  const tangentDir = earthRadial.cross(new Vector3(0, 1, 0)).normalize();
  const relativeVelocity = tangentDir.scale(circularSpeed);

  // 4. Combine Earth's velocity with the ship's relative orbital velocity.
  const totalVelocity = earthVelocity.add(relativeVelocity);

  return {
    position:  shipPosition,
    velocity: totalVelocity,
    mass: 1000,
    fuel: 500000,
    maxFuel: 500000,
    heading: Math.atan2(totalVelocity.z, totalVelocity.x),
    pitch: 0,
    yaw: 0,
    roll: 0,
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
    trajectoryPath: [],

    timeWarp: DEFAULT_WARP_STEP,
    flightInput: { pitch: 0, yaw: 0, roll: 0, thrusting: false },

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

    resetTimeWarp: () => set({ timeWarp: DEFAULT_WARP_STEP }),
    activeBurnDirection: null,
    throttle: 0,

    autopilotEnabled: false,
    autopilotTargetName: null,
    autopilotStatus: 'IDLE',

    // Picking a target doesn't auto-engage autopilot on its own — this just
    // records which body computeAutopilot() should fly toward. Player still
    // flips the master switch via setAutopilotEnabled/toggleAutopilot.
    setAutopilotTarget: (targetName) => set({ autopilotTargetName: targetName }),

    cancelAutopilot: () => {
      const state = get();
      state.setAutopilotEnabled(false);
      state.setAutopilotTarget(null);
    },

    setAutopilotEnabled: (enabled) => {
      // Disabling autopilot hands control back to the player immediately —
      // clear any burn autopilot was mid-way through so the ship doesn't
      // keep coasting on a stale thrust command it no longer owns.
      if (!enabled) {
        set({ autopilotEnabled: false, activeBurnDirection: null, throttle: 0, autopilotStatus: 'IDLE' });
      } else {
        set({ autopilotEnabled: true });
      }
    },

    toggleAutopilot: () => {
      const state = get();
      state.setAutopilotEnabled(!state.autopilotEnabled);
    },

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
    setFlightControls: (controls) => set({ flightInput: controls }),
    setTime: (time) => set({ time }),
    setTrajectoryPath: (path) => set({ trajectoryPath: path }),

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
        flightInput: { pitch: 0, yaw: 0, roll: 0, thrusting: false },
        isPaused: true,
        activeScanTargetId: null,
        autopilotEnabled: false,
        autopilotStatus: 'IDLE',
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
        flightInput: { pitch: 0, yaw: 0, roll: 0, thrusting: false },
        codexEntries: createInitialCodexEntries(),
        achievements: createInitialAchievements(),
        activeScanTargetId: null,
        scanProgress: 0,
        currentBodyId: null,
        ringGrazingTime: 0,
        aerobrakeTime: 0,
        isPaused: false,
        gamePhase: 'Playing',
        autopilotEnabled: false,
        autopilotTargetName: null,
        autopilotStatus: 'IDLE',
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
        autopilotEnabled: false,
        autopilotTargetName: null,
        autopilotStatus: 'IDLE',
      });
    },

    clearSave: () => {
      deleteSave();
      set({ hasSave: false });
    },

    fastTravelToTarget: (targetName) => {
      const state = get();
      const target = state.bodies.find((b) => b.name === targetName);
      if (!target) return;

      // Call external fast travel module
      const updatedShipState = calculateFastTravelState(state.ship, target);

      set({
        ship: {
          ...state.ship,
          ...updatedShipState,
        },
        // Reset active burn controls on teleport
        autopilotEnabled: false,
        autopilotTargetName: targetName,
        autopilotStatus: 'STABLE_ORBIT',
        activeBurnDirection: null,
        throttle: 0,
      });
    },
  };
});