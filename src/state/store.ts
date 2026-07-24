import { create } from 'zustand';
import { calculateFastTravelState } from '../physics/fastTravel';
import { 
  type Spacecraft, 
  type BurnDirection, 
  type FlightInputState, 
  G 
} from '../physics/constants';
import { type MovingBody, bodyVelocityAtTime } from '../physics/orbitPath';
import { type EngineSpec, DEFAULT_ENGINE } from '../physics/rocketEquation';
import { Vector3 } from '../physics/vector3';
import { buildSolarSystem } from '../scene/celestialFactory';
import type { AutopilotStatus } from '../physics/autopilot';
import { planNavigationRoute } from '../physics/navigationPlanner';
import * as THREE from 'three';


export const WARP_STEPS = [0,1,3, 2, 5, 10, 25, 50, 75, 100] as const;
export type WarpStep = (typeof WARP_STEPS)[number];

export const DEFAULT_WARP_STEP: WarpStep = 3;

export const getDisplayWarpValue = (step: WarpStep): number => Number((step * 10).toFixed(10));

function quaternionFromForward(forward: Vector3): { x: number; y: number; z: number; w: number } {
  const threeForward = new THREE.Vector3(forward.x, forward.y, forward.z).normalize();
  const localForward = new THREE.Vector3(0, 0, -1); // must match LOCAL_FORWARD in rocketMotion.ts
  const q = new THREE.Quaternion().setFromUnitVectors(localForward, threeForward);
  return { x: q.x, y: q.y, z: q.z, w: q.w };
}
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

export interface Mission {
  id: string;
  type: 'primary' | 'exploration' | 'classified';
  title: string;
  description: string;
  status: 'locked' | 'available' | 'active' | 'completed' | 'reward_claimed';
  progressText: string;
  rewardDescription?: string;
}

export interface GameState {
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
  manualThrottle: number; // 0 to 100 percentage
  setManualThrottle: (throttle: number) => void;

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

  navigationTargetName: string | null;
  setNavigationTarget: (targetName: string | null) => void;
  navigationPath: Vector3[];
  navigationReachable: boolean;
  refreshNavigationPath: () => void;

  musicMuted: boolean;
  musicVolume: number;
  setMusicMuted: (muted: boolean) => void;
  setMusicVolume: (volume: number) => void;

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

  missions: Mission[];
  acceptMission: (id: string) => void;
  decryptMission: (id: string) => void;
  claimMissionReward: (id: string) => void;
  evaluateMissions: (telemetry: any) => void;

  setShip: (ship: Spacecraft) => void;
  setBodies: (bodies: MovingBody[]) => void;
  setControls: (direction: BurnDirection | null, throttle: number) => void;
  setTime: (t: number) => void;
  setTrajectoryPath: (path: Vector3[]) => void;
  debris: { id: string; position: Vector3; radius: number; damage: number }[];
  removeDebris: (id: string) => void;
  addDebris: (d: { id: string; position: Vector3; radius: number; damage: number }) => void;

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
  missions: Mission[];
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
  // Central Sun (Recalibrated mass to prevent overpowering gravity)
  { name: 'Sun', mass: 10000000000, radius: 1400, color: 'yellow' },

  // Planetary Systems (Radius x10, Distance x10)
  [
    {
      name: 'Mercury',
      radius: 180,
      sunDistance: 39000,
      color: 'gray',
      initialAngle: 0,
    },
    {
      name: 'Venus',
      radius: 300,
      sunDistance: 72000,
      color: 'orange',
      initialAngle: Math.PI / 4,
    },
    {
      name: 'Earth',
      radius: 350,
      sunDistance: 100000,
      color: 'blue',
      initialAngle: 0,
      moons: [
        { name: 'Moon', radius: 80, color: 'lightgray'},
      ],
    },
    {
      name: 'Mars',
      radius: 240,
      sunDistance: 152000,
      color: 'red',
      initialAngle: Math.PI / 2,
      moons: [
        { name: 'Phobos', radius: 30, color: 'gray' },
        { name: 'Deimos', radius: 20, color: 'gray', initialAngle: 2.5 },
      ],
    },
    {
      name: 'Jupiter',
      radius: 3920,
      sunDistance: 520000,
      color: 'brown',
      density: 0.8, // gas giant — lighter per unit volume than rocky planets
      initialAngle: Math.PI,
      moons: [
        { name: 'Amalthea', radius: 20, color: 'red'},
        { name: 'Io', radius: 60, color: 'yellow'},
        { name: 'Europa', radius: 50, color: 'white'},
        { name: 'Ganymede', radius: 80, color: 'gray'},
        { name: 'Callisto', radius: 70, color: 'darkgray'},
        { name: 'Himalia', radius: 20, color: 'gray'},
        { name: 'Elara', radius: 20, color: 'gray'},
        { name: 'Pasiphae', radius: 10, color: 'darkgray'},
        { name: 'Sinope', radius: 10, color: 'darkgray'},
        { name: 'Carme', radius: 10, color: 'darkgray'},
      ],
    },
    {
      name: 'Saturn',
      radius: 3290,
      sunDistance: 950000,
      color: 'khaki',
      density: 0.6, // least dense gas giant
      initialAngle: Math.PI * 1.2,
      moons: [
        { name: 'Atlas', radius: 10, color: 'gray'},
        { name: 'Janus', radius: 10, color: 'gray'},
        { name: 'Epimetheus', radius: 10, color: 'gray'},
        { name: 'Mimas', radius: 20, color: 'lightgray'},
        { name: 'Enceladus', radius: 30, color: 'white'},
        { name: 'Tethys', radius: 30, color: 'lightgray',},
        { name: 'Telesto', radius: 10, color: 'gray',},
        { name: 'Calypso', radius: 10, color: 'gray',},
        { name: 'Dione', radius: 40, color: 'lightgray',},
        { name: 'Helene', radius: 10, color: 'gray',},
        { name: 'Rhea', radius: 50, color: 'lightgray',},
        { name: 'Titan', radius: 90, color: 'orange',},
        { name: 'Hyperion', radius: 20, color: 'tan',},
        { name: 'Iapetus', radius: 40, color: 'brown',},
        { name: 'Phoebe', radius: 20, color: 'darkgray',},
      ],
    },
    {
      name: 'Uranus',
      radius: 1400,
      sunDistance: 1920000,
      color: 'lightblue',
      density: 0.9, // ice giant
      initialAngle: Math.PI * 1.5,
      moons: [
        { name: 'Miranda', radius: 20, color: 'lightgray'},
        { name: 'Ariel', radius: 30, color: 'lightblue',},
        { name: 'Umbriel', radius: 30, color: 'gray',},
        { name: 'Titania', radius: 50, color: 'tan',},
        { name: 'Oberon', radius: 50, color: 'gray',},
      ],
    },
    {
      name: 'Neptune',
      radius: 1365,
      sunDistance: 3010000,
      color: 'darkblue',
      density: 1.1, // ice giant, slightly denser than Uranus
      initialAngle: Math.PI * 1.8,
      moons: [
        { name: 'Larissa', radius: 20, color: 'gray'},
        { name: 'Proteus', radius: 30, color: 'darkgray'},
        { name: 'Triton', radius: 60, color: 'lightblue'},
        { name: 'Nereid', radius: 20, color: 'gray'},
      ],
    },
    {
      name: 'Pluto',
      radius: 60,
      sunDistance: 3950000,
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
      orientation: { x: 0, y: 0, z: 0, w: 1 }, // NEW
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
    fuel: 500000000,
    maxFuel: 500000000,
    health: 100,
    maxHealth: 100,
    heading: Math.atan2(totalVelocity.z, totalVelocity.x),
    pitch: 0,
    yaw: 0,
    roll: 0,
  orientation: quaternionFromForward(totalVelocity),  };
};

type Debris = { id: string; position: Vector3; radius: number; damage: number };

function createInitialDebris(bodies: MovingBody[] = initialBodies, count = 150): Debris[] {
  const list: Debris[] = [];
  const earth = bodies.find((b) => b.name === 'Earth');
  const center = earth ? earth.position : new Vector3(0, 0, 0);

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 55 + Math.random() * 90;
    const x = center.x + Math.cos(angle) * radius;
    const y = center.y + Math.sin(angle) * radius;
    list.push({ id: `deb-${i}`, position: new Vector3(x, y, 0), radius: 1 + Math.random() * 1.5, damage: 10 + Math.floor(Math.random() * 20) });
  }
  return list;
}

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

  const createInitialMissions = (): Mission[] => [
    {
      id: 'sys_calib',
      type: 'primary',
      title: 'Phase I: Systems Calibration',
      description: 'Central Command requires a nominal engine burn to verify thrust telemetry. Engage the main drive and exceed $200\\text{ m/s}$ relative velocity to complete calibration.',
      status: 'active',
      progressText: 'Awaiting ignition...',
      rewardDescription: '+100 Fuel',
    },
    {
      id: 'circ_orbit',
      type: 'primary',
      title: 'Phase II: Stable Circular Orbit',
      description: 'Navigation computers require a stable parking orbit before deep-space transit. Achieve an eccentricity $\\epsilon < 0.05$ and a periapsis altitude $> 300\\text{ km}$ above the planetary surface.',
      status: 'active',
      progressText: 'Evaluating orbital parameters...',
      rewardDescription: '+500 Fuel, Codex: Orbits',
    },
    {
      id: 'apo_raise',
      type: 'primary',
      title: 'Phase III: Apoapsis Elevation',
      description: 'To prepare for transit to the outer colonies, perform a prograde burn at periapsis to extend your apoapsis (highest point) distance past $2500\\text{ km}$.',
      status: 'active',
      progressText: 'Waiting for altitude target...',
      rewardDescription: 'Codex: Advanced Orbits',
    },
    {
      id: 'escape_traj',
      type: 'primary',
      title: 'Phase IV: Escape Velocity',
      description: 'We are cleared for departure. Ignite the main drive and accelerate until your orbit becomes hyperbolic (eccentricity $\\epsilon > 1.0$), permanently escaping the planet\'s gravity well.',
      status: 'active',
      progressText: 'Monitoring trajectory shape...',
      rewardDescription: '+1500 Fuel, FTL Drive Schematics',
    },
    {
      id: 'luna_flyby',
      type: 'exploration',
      title: 'Luna Minor Proximity',
      description: 'Execute a close gravitational pass within the sphere of influence of Luna Minor to scan for pre-collapse artifacts.',
      status: 'available',
      progressText: 'Contract pending acquisition.',
      rewardDescription: 'Sensor Upgrade Data',
    },
    {
      id: 'high_speed',
      type: 'exploration',
      title: 'Orbital Velocity Milestone',
      description: 'Exceed orbital velocity thresholds above $500\\text{ m/s}$.',
      status: 'available',
      progressText: 'Monitoring telemetry speed...',
      rewardDescription: '+250 Fuel',
    },
    {
      id: 'zero_vel',
      type: 'classified',
      title: 'Anomaly: Zero-Velocity Hover',
      description: 'Temporarily cancel all relative momentum inside deep space without collapsing into a body.',
      status: 'locked',
      progressText: 'Encrypted objective locked.',
      rewardDescription: 'Unknown Anomalous Data',
    },
    {
      id: 'atmos_graze',
      type: 'classified',
      title: 'Atmospheric Friction Test',
      description: 'Graze the upper fringe threshold of a celestial body solid radius safely.',
      status: 'locked',
      progressText: 'Encrypted objective locked.',
      rewardDescription: 'Unknown Anomalous Data',
    }
  ];

  return {
    ship: createInitialShip(initialBodies),
    bodies: initialBodies,
    debris: createInitialDebris(initialBodies),
    engine: DEFAULT_ENGINE,
    time: 0,
    trajectoryPath: [],
    navigationTargetName: null,
    navigationPath: [],
    navigationReachable: false,

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
    manualThrottle: 100,
    setManualThrottle: (throttle) => set({ manualThrottle: Math.max(0, Math.min(100, throttle)) }),

    autopilotEnabled: false,
    autopilotTargetName: null,
    autopilotStatus: 'IDLE',

    // Picking a target doesn't auto-engage autopilot on its own — this just
    // records which body computeAutopilot() should fly toward. Player still
    // flips the master switch via setAutopilotEnabled/toggleAutopilot.
    setAutopilotTarget: (targetName) => set({ autopilotTargetName: targetName }),

    setNavigationTarget: (targetName) => {
      set({ navigationTargetName: targetName });
      get().refreshNavigationPath();
    },

    refreshNavigationPath: () => {
      const state = get();
      const targetName = state.navigationTargetName;
      if (targetName) {
        // Compute path based on current live state
        const plan = planNavigationRoute(state.ship, state.bodies, targetName, state.engine, state.time);
        set({ navigationPath: plan.path, navigationReachable: plan.reachable });
      } else {
        set({ navigationPath: [], navigationReachable: false });
      }
    },

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
    musicMuted: false,
    musicVolume: 80,
    setMusicMuted: (muted) => set({ musicMuted: muted }),
    setMusicVolume: (volume) => set({ musicVolume: Math.max(0, Math.min(100, volume)) }),
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

    missions: createInitialMissions(),
    acceptMission: (id) => {
      set((state) => ({
        missions: state.missions.map(m => m.id === id && m.status === 'available' ? { ...m, status: 'active' } : m)
      }));
    },
    decryptMission: (id) => {
      set((state) => ({
        missions: state.missions.map(m => m.id === id && m.status === 'locked' ? { ...m, status: 'active' } : m)
      }));
    },
    claimMissionReward: (id) => {
      set((state) => {
        const mission = state.missions.find(m => m.id === id);
        if (!mission || mission.status !== 'completed') return state;

        let newShip = { ...state.ship };
        if (mission.id === 'sys_calib') newShip.fuel = Math.min(newShip.maxFuel, newShip.fuel + 100);
        if (mission.id === 'circ_orbit') newShip.fuel = Math.min(newShip.maxFuel, newShip.fuel + 500);
        if (mission.id === 'escape_traj') newShip.fuel = Math.min(newShip.maxFuel, newShip.fuel + 1500);
        if (mission.id === 'high_speed') newShip.fuel = Math.min(newShip.maxFuel, newShip.fuel + 250);

        return {
          missions: state.missions.map(m => m.id === id ? { ...m, status: 'reward_claimed' } : m),
          ship: newShip
        };
      });
    },
    evaluateMissions: (tel) => {
      set((state) => {
        let changed = false;
        const newMissions = state.missions.map(m => {
          if (m.status !== 'active') return m;
          
          if (m.id === 'sys_calib') {
            const highVel = (tel.velocity ?? 0) >= 200;
            if (highVel) {
              changed = true;
              return { ...m, status: 'completed', progressText: 'Status: Completed' };
            }
            const newText = `Vel: ${Math.round(tel.velocity ?? 0)}m/s / 200m/s`;
            if (m.progressText !== newText) { changed = true; return { ...m, progressText: newText }; }
          }

          if (m.id === 'circ_orbit') {
            const isCirc = (tel.eccentricity ?? 1) < 0.05 && (tel.periapsisAltitude ?? 0) > 300;
            if (isCirc) {
              changed = true;
              return { ...m, status: 'completed', progressText: 'Status: Completed' };
            }
            const newText = `Ecc: ${(tel.eccentricity ?? 0).toFixed(3)}, Pe: ${Math.round(tel.periapsisAltitude ?? 0)}km`;
            if (m.progressText !== newText) { changed = true; return { ...m, progressText: newText }; }
          }
          
          if (m.id === 'apo_raise') {
            const highApo = (tel.apoapsis ?? 0) >= 2500;
            if (highApo) {
              changed = true;
              return { ...m, status: 'completed', progressText: 'Status: Completed' };
            }
            const newText = `Apoapsis: ${Math.round(tel.apoapsis ?? 0)}km / 2500km`;
            if (m.progressText !== newText) { changed = true; return { ...m, progressText: newText }; }
          }

          if (m.id === 'escape_traj') {
            const escaping = (tel.eccentricity ?? 0) > 1.0;
            if (escaping) {
              changed = true;
              return { ...m, status: 'completed', progressText: 'Status: Hyperbolic Trajectory Confirmed' };
            }
            const newText = `Eccentricity: ${(tel.eccentricity ?? 0).toFixed(3)} / 1.000`;
            if (m.progressText !== newText) { changed = true; return { ...m, progressText: newText }; }
          }

          if (m.id === 'high_speed') {
            const fast = (tel.velocity ?? 0) >= 500;
            if (fast) {
              changed = true;
              return { ...m, status: 'completed', progressText: 'Contract Fulfilled' };
            }
            const newText = `Vel: ${Math.round(tel.velocity ?? 0)}m/s`;
            if (m.progressText !== newText) { changed = true; return { ...m, progressText: newText }; }
          }

          return m;
        });

        return changed ? { missions: newMissions } : state;
      });
    },

    setShip: (ship) => set({ ship }),
    setBodies: (bodies) => set({ bodies }),
    setControls: (direction, throttle) => set({ activeBurnDirection: direction, throttle }),
    setFlightControls: (controls) => set({ flightInput: controls }),
    setTime: (time) => set({ time }),
    setTrajectoryPath: (path) => set({ trajectoryPath: path }),
    removeDebris: (id: string) => {
      const state = get();
      set({ debris: state.debris.filter((d: any) => d.id !== id) });
    },
    addDebris: (d: { id: string; position: Vector3; radius: number; damage: number }) => {
      const state = get();
      set({ debris: [...state.debris, d] });
    },

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
        missions: state.missions,
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
        manualThrottle: 100,
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
        debris: createInitialDebris(initialBodies),
        engine: DEFAULT_ENGINE,
        time: 0,
        activeBurnDirection: null,
        throttle: 0,
        manualThrottle: 100,
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
        missions: createInitialMissions(),
        autopilotEnabled: false,
        autopilotTargetName: null,
        autopilotStatus: 'IDLE',
        navigationPath: [],
        navigationReachable: false,
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
          orientation: data.ship.orientation ?? { x: 0, y: 0, z: 0, w: 1 }
        },
        engine: data.engine,
        time: data.time,
        codexEntries: data.codexEntries,
        achievements: data.achievements,
        missions: data.missions ?? createInitialMissions(),
        debris: createInitialDebris(initialBodies),
        activeBurnDirection: null,
        throttle: 0,
        manualThrottle: 100,
        activeScanTargetId: null,
        scanProgress: 0,
        isPaused: false,
        gamePhase: 'Playing',
        autopilotEnabled: false,
        autopilotTargetName: null,
        autopilotStatus: 'IDLE',
        navigationPath: [],
        navigationReachable: false,
        
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