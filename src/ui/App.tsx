import { Canvas } from '@react-three/fiber';
import { StarfieldBackground } from './components/canvas/StarfieldBackground';
import { SceneManager } from '../scene/SceneManager';
import { useStore } from '../state/store';
import { StatusHUD } from './components/hud/StatusHUD';
import { ExplorerCodex } from './components/hud/ExplorerCodex';
import { CodexUnlocker } from './components/hud/CodexUnlocker';
import { BurnControls } from './components/controls/BurnControls';
import { PauseMenu } from './PauseMenu';
import { CaptionBox, showGameCaption } from './components/hud/CaptionBox';
import { MissionCompleteAnimation } from './components/hud/MissionCompleteAnimation';
import { MissionBadgeOverlay } from './components/hud/MissionBadgeOverlay';
import { HyperspaceOverlay } from './components/hud/HyperspaceOverlay';
import { Minimap } from './components/hud/Minimap';
import { TimeWarpControls } from './TimeWarpControls';
import { NavigationPanel } from './NavigationPanel';
import { AutopilotPanel } from './AutopilotPanel';
import { FastTravelPanel } from './components/hud/FastTravelPanel';
import { MusicControls } from './components/hud/MusicControls';
import { useEffect, useRef } from 'react';
import { MainMenu } from './MainMenu';
import MusicManager from './MusicManager';
import GameOverModal from './GameOverModal';
import { StoryManager } from '../game/StoryManager';

const EDUCATIONAL_ORBITAL_FACTS: { category: string; fact: string }[] = [
  { category: 'Orbital Mechanics', fact: 'Kepler’s second law states that a line segment joining a planet and the Sun sweeps out equal areas during equal intervals of time.' },
  { category: 'Orbital Mechanics', fact: 'The Oberth effect makes rocket burns much more efficient when performed at high speeds (periapsis) near a massive body.' },
  { category: 'Physics', fact: 'In a vacuum, all objects fall at the exact same rate regardless of their mass.' },
  { category: 'Orbital Mechanics', fact: 'To catch up to a target ahead of you in the same orbit, you must actually slow down to drop into a lower, faster orbit.' },
  { category: 'Astrophysics', fact: 'Escape velocity is the speed needed to break free from a gravitational field without further propulsion. For Earth, it is ~11.2 km/s.' },
  { category: 'Astrophysics', fact: 'The Lagrange points are positions in space where the gravitational pull of two large masses precisely equals the centripetal force required for a small object to move with them.' },
  { category: 'Spaceflight', fact: 'A Hohmann transfer orbit is an elliptical orbit used to transfer between two circular orbits of different radii in the same plane.' },
];

const DEEP_SPACE_LORE: string[] = [
  'Brown dwarfs are failed stars in the cold dark, lacking the mass to sustain hydrogen fusion but glowing faintly in infrared.',
  'Myth: The asteroid belt is crowded. Fact: If you stood on an asteroid in the main belt, you likely could not see another one with the naked eye.',
  'Myth: Space is completely empty. Fact: Interstellar space contains gas, dust, and cosmic rays, though at an extremely low density.',
  'Perspective tricks make distant objects appear close in space due to the lack of atmospheric haze.',
  'Micrometeoroids mean hull checks matter in every mission. Even a grain of sand at orbital velocities can cause catastrophic damage.',
  'Neutron stars are so dense that a teaspoon of their material would weigh about 6 billion tons on Earth.',
  'Myth: There is no gravity in space. Fact: Microgravity is freefall. The ISS experiences about 90% of Earth’s surface gravity, but it is falling around the Earth!',
  'Space smells like seared steak, hot metal, and welding fumes, according to astronauts who have stepped outside the ISS.',
  'The speed of light is roughly 300,000 kilometers per second, meaning sunlight takes about 8 minutes to reach Earth.',
  'Rogue planets wander the galaxy unbound to any star, cast out of their home systems in the chaotic early days of planet formation.',
  'A day on Venus is longer than a year on Venus. It rotates extremely slowly on its axis.',
  'Dark matter makes up about 27% of the universe, yet it interacts with ordinary matter only through gravity.',
  'Myth: Black holes suck everything in. Fact: Black holes do not suck. They exert gravity just like any other mass. If the Sun were replaced by a black hole of equal mass, Earth would orbit it normally.',
  'There is a giant cloud of alcohol in Sagittarius B2, near the center of our galaxy.',
  'Neutrinos are ghost particles that pass through almost all matter undisturbed. Trillions of them pass through your body every second.',
  'The coldest place in the universe found so far is the Boomerang Nebula, at 1 Kelvin (-272°C), just one degree above absolute zero.',
];

const PLANET_HAZARDS: { id: string; name: string; description: string; severity: string; evaluator: (data: { altitude: number; velocity: number }) => boolean }[] = [];

/**
 * Custom hook to manage the high-altitude jet thruster sound effect on Spacebar press.
 */
function useThrusterAudio(isThrusting: boolean, sfxVolume: number = 70) {
  const thrusterAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio instance from public folder
    thrusterAudioRef.current = new Audio('/Jet-Plane-Ambience_High-Altitude_Interior.mp3');
    thrusterAudioRef.current.loop = true;
  }, []);

  useEffect(() => {
    if (thrusterAudioRef.current) {
      thrusterAudioRef.current.volume = sfxVolume / 100;
    }
  }, [sfxVolume]);

  useEffect(() => {
    const audio = thrusterAudioRef.current;
    if (!audio) return;

    if (isThrusting) {
      audio.play().catch(() => {
        // Handled browser autoplay restrictions gracefully
      });
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [isThrusting]);
}

export default function App() {
  const gamePhase = useStore((state) => state.gamePhase);
  const isPaused = useStore((state) => state.isPaused);
  const togglePaused = useStore((state) => state.togglePaused);
  const setFlightControls = useStore((state) => state.setFlightControls);

  const isThrusting = useStore((state) => state.flightInput.thrusting);

  // Hook up your high-altitude jet ambience to Spacebar holding
  useThrusterAudio(isThrusting, 80);

  // Only trigger the intro caption when entering the 'Playing' phase
  useEffect(() => {
    if (gamePhase === 'Playing') {
      showGameCaption(
        'System online. Tap a burn direction to begin steering, then hold throttle to ignite. Your first objective: escape low orbit and intercept the transfer window.',
        'info',
        [
          {
            label: 'Planet Hazards & Facts',
            handler: () => {
              const randomFact = EDUCATIONAL_ORBITAL_FACTS[Math.floor(Math.random() * EDUCATIONAL_ORBITAL_FACTS.length)];
              showGameCaption(`[${randomFact.category}] ${randomFact.fact}`, 'tip');
            },
          },
          {
            label: 'Deep-Space Lore',
            handler: () => {
              const randomLore = DEEP_SPACE_LORE[Math.floor(Math.random() * DEEP_SPACE_LORE.length)];
              showGameCaption(randomLore, 'tip');
            },
          },
          {
            label: 'Star Navigation',
            handler: () =>
              showGameCaption(
                'Constellations are sky-region waypoints, not real clusters. Calibrate your nav-computer by star-hopping through known patterns and discover alien names for the same star fields.',
                'tip'
              ),
          },
        ]
      );
    }
  }, [gamePhase]);

  // Real-time Planetary Hazard Monitor (with anti-spam check)
  useEffect(() => {
    let lastTriggeredHazardId: string | null = null;

    const interval = setInterval(() => {
      const telemetry = (window as any).__shipTelemetry;
      if (!telemetry || isPaused) return;

      const activeHazard = PLANET_HAZARDS.find(hazard => 
        hazard.evaluator({
          altitude: telemetry.periapsisAltitude ?? 500,
          velocity: telemetry.velocity ?? 7.0,
        })
      );

      if (activeHazard && activeHazard.id !== lastTriggeredHazardId) {
        lastTriggeredHazardId = activeHazard.id;
        (window as any).__gameCaptionLast = {
          id: `hazard-${activeHazard.id}-${Date.now()}`,
          text: `[HAZARD ALERT] ${activeHazard.name}: ${activeHazard.description}`,
          type: activeHazard.severity === 'critical' ? 'warning' : 'info',
          timestamp: new Date().toLocaleTimeString()
        };
      } else if (!activeHazard) {
        lastTriggeredHazardId = null;
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isPaused]);

  // Keyboard Flight Controls & Pause Listener
  useEffect(() => {
    const pressedKeys = new Set<string>();

    const updateFlightControls = () => {
      setFlightControls({
        pitch: (pressedKeys.has('w') ? 1 : 0) - (pressedKeys.has('s') ? 1 : 0),
        yaw: (pressedKeys.has('d') ? 1 : 0) - (pressedKeys.has('a') ? 1 : 0),
        roll: (pressedKeys.has('e') ? 1 : 0) - (pressedKeys.has('q') ? 1 : 0),
        thrusting: pressedKeys.has('space'),
        manualThrottle: useStore.getState().manualThrottle,
      });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.code === 'Space' ? 'space' : event.key.toLowerCase();

      if (key === 'escape' && gamePhase === 'Playing') {
        event.preventDefault();
        togglePaused();
        return;
      }

      if (['w', 'a', 's', 'd', 'q', 'e', 'space'].includes(key)) {
        event.preventDefault();
        pressedKeys.add(key);
        updateFlightControls();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.code === 'Space' ? 'space' : event.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'q', 'e', 'space'].includes(key)) {
        pressedKeys.delete(key);
        updateFlightControls();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    updateFlightControls();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gamePhase, setFlightControls, togglePaused]);

  if (gamePhase === 'menu') {
    return (
      <>
        <MusicManager />
        <MainMenu />
      </>
    );
  }

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden select-none font-mono">
      <MusicManager />
      <StoryManager />
      
      {/* 3D Render Layer with Canvas, Starfield Background, and Scene Manager */}
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, 4, -15], fov: 60, near: 0.1, far: 10000000 }}
          className="w-full h-full"
        >
          <color attach="background" args={['#020408']} />
          
          {/* 3D Stars & Milky Way Background */}
          <StarfieldBackground />

          {/* Core Scene Manager (Planets, Ships, Orbits) */}
          <SceneManager />
        </Canvas>
      </div>

      {/* UI Overlay - grid to avoid panel overlap */}
      <MissionCompleteAnimation />
      <MissionBadgeOverlay />
      <HyperspaceOverlay />
      <div className="absolute inset-0 z-10 pointer-events-none p-6 grid grid-cols-[minmax(320px,40vw)_1fr_320px] grid-rows-[1fr_auto] gap-6">
        {/* Left column: HUD + Codex */}
        <div className=" pointer-events-auto flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
            <div className="pointer-events-auto">
              <StatusHUD />
            </div>
            <div className="pointer-events-auto w-full xl:w-[min(420px,40vw)]">
              <ExplorerCodex />
            </div>
          </div>

          <div className="pointer-events-auto">
            <CaptionBox />
          </div>
        </div>

        {/* Center column reserved for future mid-screen UI (keeps it free) */}
        <div className="col-start-2 row-start-1 pointer-events-none" />

        {/* Right column: Burn controls */}
        <div className="col-start-3 row-start-1 pointer-events-auto self-start">
          <div className="w-full max-w-[320px]">
            <BurnControls />
          </div>
        </div>

        {/* Bottom-left: Navigation, Time & Music Controls */}
        <div className="col-start-1 row-start-2 pointer-events-auto flex flex-col items-start gap-4">
          {isPaused && <MusicControls />}
          <TimeWarpControls />
          <NavigationPanel />
          <AutopilotPanel />
          <FastTravelPanel />
        </div>

        {/* Bottom-right: Minimap */}
        <div className="col-start-3 row-start-2 pointer-events-auto self-end justify-self-end">
          <Minimap />
        </div>

        {/* Global Floating Modals & Scanners */}
        <CodexUnlocker />
        <PauseMenu />

        {/* Floating: modal-like components that need to overlay everything */}
        <div className="col-start-2 row-start-1 row-end-3 pointer-events-none">
          <CodexUnlocker />
          <PauseMenu />
          {gamePhase === 'GameOver' && <GameOverModal />}
        </div>
      </div>
    </div>
  );
}