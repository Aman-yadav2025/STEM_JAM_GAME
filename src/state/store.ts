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
  meta?: any;
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

  storyProgress: number;
  setStoryProgress: (chapter: number) => void;
  isStorySequenceActive: boolean;
  setStorySequenceActive: (active: boolean) => void;
  playerName: string;
  setPlayerName: (name: string) => void;

  activeCompletedMission: string | null;
  setActiveCompletedMission: (id: string | null) => void;

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
  storyProgress: number;
  playerName: string;
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


  let earthVelocity = Vector3.zero();
  if (earth.orbit) {
    earthVelocity = bodyVelocityAtTime(earth.orbit, 0);
  }


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

  const createInitialMissions = (): Mission[] => {
    const mainMissions: Mission[] = [
      {
        id: 'pz_act1_earth',
        type: 'primary',
        title: 'Act I: The Patient Zero Pathogen',
        description: 'Extract the unmutated base of the virus from Earth orbit.',
        status: 'active',
        progressText: '0/1 Pathogen Secured',
      },
      {
        id: 'pz_act2_mercury',
        type: 'primary',
        title: 'Act II: The Solar Catalyst',
        description: 'Acquire solar-forged isotopes from Mercury.',
        status: 'locked',
        progressText: 'Locked. Awaiting Act I completion.',
      },
      {
        id: 'pz_act3_venus',
        type: 'primary',
        title: 'Act III: The Sulfuric Solvent',
        description: 'Dive into the clouds of Venus for sulfuric enzymes.',
        status: 'locked',
        progressText: 'Locked.',
      },
      {
        id: 'pz_act4_mars',
        type: 'primary',
        title: 'Act IV: The Oxidized Binding Agent',
        description: 'Retrieve oxidized salts from Olympus Mons.',
        status: 'locked',
        progressText: 'Locked.',
      },
      {
        id: 'pz_act5_jupiter',
        type: 'primary',
        title: 'Act V: The High-Pressure Stabilizer',
        description: 'Extract metallic hydrogen from Jupiter.',
        status: 'locked',
        progressText: 'Locked.',
      },
      {
        id: 'pz_act6_saturn',
        type: 'primary',
        title: 'Act VI: The Electro-Magnetic Polarizer',
        description: 'Harvest charged aerosols from Saturn’s north pole.',
        status: 'locked',
        progressText: 'Locked.',
      },
      {
        id: 'pz_act7_uranus',
        type: 'primary',
        title: 'Act VII: The Cryo-Ammonia Matrix',
        description: 'Mine cryo-ammonia from Uranus’s mantle ice.',
        status: 'locked',
        progressText: 'Locked.',
      },
      {
        id: 'pz_act8_neptune',
        type: 'primary',
        title: 'Act VIII: The Supersonic Dispersant',
        description: 'Capture hyper-kinetic methane isotopes from Neptune.',
        status: 'locked',
        progressText: 'Locked.',
      },
      {
        id: 'pz_act9_pluto',
        type: 'primary',
        title: 'Act IX: The Final Sacrifice',
        description: 'Fuse the precursors with primordial nitrogen ice on Pluto.',
        status: 'locked',
        progressText: 'Locked.',
      }
    ];

    const majorMoons = [
      { id: 'opt_moon_moon', name: 'Moon', desc: "Scan Earth's Moon for abandoned evacuation fleets." },
      { id: 'opt_moon_phobos', name: 'Phobos', desc: 'Investigate the Martian monolith on Phobos.' },
      { id: 'opt_moon_europa', name: 'Europa', desc: 'Search for the deep-ice quarantine facility on Europa.' },
      { id: 'opt_moon_ganymede', name: 'Ganymede', desc: 'Analyze the magnetic anomalies on Ganymede.' },
      { id: 'opt_moon_titan', name: 'Titan', desc: 'Check the methane lakes on Titan for sunken supply drops.' },
      { id: 'opt_moon_enceladus', name: 'Enceladus', desc: 'Trace the looping distress signal on Enceladus.' },
      { id: 'opt_moon_miranda', name: 'Miranda', desc: 'Survey the shattered ice canyons of Miranda.' },
      { id: 'opt_moon_triton', name: 'Triton', desc: 'Observe the cryovolcanoes on Triton.' }
    ];

    const moonMissions: Mission[] = majorMoons.map(m => ({
      id: m.id,
      type: 'exploration',
      title: `Optional: Explore ${m.name}`,
      description: m.desc,
      status: 'available',
      progressText: `Visit ${m.name}`
    }));

    const classifiedMissions: Mission[] = [
      {
        id: 'cls_icarus_run',
        type: 'classified',
        title: 'The Icarus Run',
        description: "A legendary pre-pandemic smuggler's route. Follow it to unlock its myth.",
        status: 'available',
        progressText: 'Waypoint: Venus (0/3)',
        meta: {
          path: ['venus', 'mercury', 'sun'],
          step: 0
        }
      },
      {
        id: 'cls_jovian_gauntlet',
        type: 'classified',
        title: 'The Jovian Gauntlet',
        description: "A military endurance test through Jupiter's radiation belts.",
        status: 'available',
        progressText: 'Waypoint: Jupiter (0/3)',
        meta: {
          path: ['jupiter', 'europa', 'ganymede'],
          step: 0
        }
      },
      {
        id: 'cls_deep_dark',
        type: 'classified',
        title: 'The Deep Dark',
        description: 'The rumored flight path of the first rogue AI probes.',
        status: 'available',
        progressText: 'Waypoint: Uranus (0/3)',
        meta: {
          path: ['uranus', 'neptune', 'pluto'],
          step: 0
        }
      }
    ];

    return [...mainMissions, ...moonMissions, ...classifiedMissions];
  };

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

    storyProgress: 0,
    setStoryProgress: (chapter) => set({ storyProgress: chapter }),
    isStorySequenceActive: false,
    setStorySequenceActive: (active) => set({ isStorySequenceActive: active }),
    playerName: 'Commander',
    setPlayerName: (name) => set({ playerName: name }),

    activeCompletedMission: null,
    setActiveCompletedMission: (id) => set({ activeCompletedMission: id }),

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

        return {
          missions: state.missions.map(m => m.id === id ? { ...m, status: 'reward_claimed' } : m),
          ship: newShip
        };
      });
    },
    evaluateMissions: (tel) => {
      set((state) => {
        let changed = false;
        const newMissions: Mission[] = state.missions.map((m, _index) => {
          if (m.status !== 'active') return m;
          
          let completed = false;
          let newText = m.progressText;

          if (m.id === 'tour_1_drive') {
            const highVel = (tel.velocity ?? 0) >= 10000;
            if (highVel) completed = true;
            else newText = `Velocity: ${Math.round(tel.velocity ?? 0)} / 10000 m/s`;
          }
          else if (m.id === 'tour_2_escape') {
            const escaping = tel.dominantBody === 'Earth' && (tel.eccentricity ?? 0) > 1.0;
            if (escaping) completed = true;
            else newText = tel.dominantBody === 'Earth' ? `Eccentricity: ${(tel.eccentricity ?? 0).toFixed(3)} / 1.000` : 'Not orbiting Earth';
          }
          else if (m.id === 'tour_3_mars') {
            if (tel.dominantBody === 'Mars') completed = true;
            else newText = 'En route to Mars...';
          }
          else if (m.id === 'tour_4_jupiter_intercept') {
            if (tel.dominantBody === 'Jupiter') completed = true;
            else newText = 'En route to Jupiter...';
          }
          else if (m.id === 'tour_5_jupiter_capture') {
            const captured = tel.dominantBody === 'Jupiter' && (tel.eccentricity ?? 1) < 1.0;
            if (captured) completed = true;
            else newText = tel.dominantBody === 'Jupiter' ? `Eccentricity: ${(tel.eccentricity ?? 1).toFixed(3)} / 1.000` : 'Not orbiting Jupiter';
          }
          else if (m.id === 'tour_6_saturn') {
            if (tel.dominantBody === 'Saturn') completed = true;
            else newText = 'En route to Saturn...';
          }
          else if (m.id === 'tour_7_ice_giants') {
            if (tel.dominantBody === 'Uranus' || tel.dominantBody === 'Neptune') completed = true;
            else newText = 'En route to Uranus/Neptune...';
          }
          else if (m.id === 'tour_8_pluto') {
            if (tel.dominantBody === 'Pluto') completed = true;
            else newText = 'En route to Pluto...';
          }
          else if (m.id === 'tour_9_interstellar') {
            const escaping = tel.dominantBody === 'Sun' && (tel.eccentricity ?? 0) > 1.0;
            if (escaping) completed = true;
            else newText = tel.dominantBody === 'Sun' ? `Eccentricity: ${(tel.eccentricity ?? 0).toFixed(3)} / 1.000` : 'Not in solar orbit';
          }

          if (completed) {
            changed = true;
            return { ...m, status: 'completed', progressText: 'Objective Complete!' };
          }
          if (m.progressText !== newText) {
            changed = true;
            return { ...m, progressText: newText };
          }
          return m;
        });

        // Auto-unlock next mission if one was just completed
        for (let i = 0; i < newMissions.length; i++) {
          if (newMissions[i].status === 'completed' && state.missions[i].status === 'active') {
             // A mission just completed this frame. Unlock the next one if it's locked.
             if (i + 1 < newMissions.length && newMissions[i+1].status === 'locked') {
               newMissions[i+1] = { ...newMissions[i+1], status: 'active', progressText: 'Objective assigned.' } as Mission;
               changed = true;
             }
          }
        }

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
        storyProgress: state.storyProgress,
        playerName: state.playerName,
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

      const initialMissions = createInitialMissions();
      const savedMissions = data.missions || [];
      const mergedMissions = initialMissions.map(initialMission => {
        const savedMission = savedMissions.find((m: any) => m.id === initialMission.id);
        return savedMission ? savedMission : initialMission;
      });

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
        missions: mergedMissions,
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