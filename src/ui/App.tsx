import { useEffect } from 'react';
import { MainMenu } from './MainMenu';
import { SceneManager } from '../scene/SceneManager';
import { useStore } from '../state/store';
import { StatusHUD } from './components/hud/StatusHUD';
import { ExplorerCodex } from './components/hud/ExplorerCodex';
import { CodexUnlocker } from './components/hud/CodexUnlocker';
import { BurnControls } from './components/controls/BurnControls';
import { PauseMenu } from './PauseMenu';
import { CaptionBox, showGameCaption } from './components/hud/CaptionBox';
import { Minimap } from './components/hud/Minimap';
import { TimeWarpControls } from './TimeWarpControls';
import { AutopilotPanel } from './AutopilotPanel';
import { FastTravelPanel } from './components/hud/FastTravelPanel';

// --- EDUCATIONAL ORBITAL FACTS ---
export const EDUCATIONAL_ORBITAL_FACTS = [
  {
      category: 'Orbital Mechanics',
      fact: 'The Oberth Effect proves that burning rocket fuel when traveling at maximum speed (at periapsis) yields significantly more kinetic energy change than burning at apoapsis.'
  },
  {
      category: 'Kepler’s Third Law',
      fact: 'The square of a planet\'s orbital period is directly proportional to the cube of the semi-major axis of its orbit ($T^2 \\propto a^3$).'
  },
  {
      category: 'Lagrange Points',
      fact: 'Points L1 through L5 represent positions of gravitational equilibrium between two celestial bodies, allowing spacecraft to maintain formation with minimal fuel consumption.'
  },
  {
      category: 'Orbital Velocity',
      fact: 'To stay in Low Earth Orbit (LEO), a spacecraft must travel at roughly 7.8 km/s (28,080 km/h), falling continuously around the curvature of the Earth.'
  },
  {
      category: 'Tidal Forces',
      fact: 'Gravitational gradients across an extended body cause tidal stretching. Close orbits inside the Roche limit will tear unpowered bodies apart.'
  }
];

// --- PLANET HAZARDS SYSTEM ---
export interface PlanetHazard {
  id: string;
  name: string;
  type: 'radiation' | 'atmosphere' | 'thermal' | 'debris';
  severity: 'low' | 'moderate' | 'critical';
  description: string;
  evaluator: (telemetry: { altitude: number; velocity: number; distanceToSun?: number }) => boolean;
}

export const PLANET_HAZARDS: PlanetHazard[] = [
  {
      id: 'van_allen_belt',
      name: 'Van Allen Radiation Belt',
      type: 'radiation',
      severity: 'moderate',
      description: 'High-energy charged particles trapped by planetary magnetic field. Electronics and solar arrays undergoing degradation.',
      evaluator: (t) => t.altitude >= 1000 && t.altitude <= 5000,
  },
  {
      id: 'atmospheric_drag',
      name: 'Upper Ionosphere Thermal Friction',
      type: 'atmosphere',
      severity: 'critical',
      description: 'WARNING: Spacecraft encountering residual atmospheric molecules. Rapid orbital decay and thermal stress detected!',
      evaluator: (t) => t.altitude < 150 && t.altitude > 0,
  },
  {
      id: 'solar_flare',
      name: 'Coronal Mass Ejection (CME)',
      type: 'thermal',
      severity: 'critical',
      description: 'Solar radiation storm active! Seek planetary shadow immediately to prevent telemetry failure.',
      evaluator: (t) => (t.distanceToSun ?? 10000) < 2500,
  },
  {
      id: 'orbital_debris_field',
      name: 'Kessler Syndrome Debris Ring',
      type: 'debris',
      severity: 'moderate',
      description: 'Dense concentration of defunct satellite fragments in low orbit. Evasive maneuvering recommended.',
      evaluator: (t) => t.altitude >= 700 && t.altitude <= 900 && t.velocity > 7.5,
  }
];

export default function App() {
  const gamePhase = useStore((state) => state.gamePhase);
  const isPaused = useStore((state) => state.isPaused);
  const togglePaused = useStore((state) => state.togglePaused);
  const setFlightControls = useStore((state) => state.setFlightControls);

  // Only trigger the intro caption when entering the 'playing' phase
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
            handler: () =>
              showGameCaption(
                'Brown dwarfs are failed stars in the cold dark. Perspective tricks make distant objects appear close, and micrometeoroids mean hull checks matter in every mission.',
                'tip'
              ),
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
      const telemetry = window.__shipTelemetry;
      if (!telemetry || isPaused) return;

      const activeHazard = PLANET_HAZARDS.find(hazard => 
        hazard.evaluator({
          altitude: telemetry.periapsisAltitude ?? 500,
          velocity: telemetry.velocity ?? 7.0,
        })
      );

      if (activeHazard && activeHazard.id !== lastTriggeredHazardId) {
        lastTriggeredHazardId = activeHazard.id;
        window.__gameCaptionLast = {
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
    return <MainMenu />;
  }

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden select-none">
      {/* 3D Render Layer */}
      <div className="absolute inset-0 z-0">
        <SceneManager />
      </div>

      {/* Structured UI Overlay Layer (Pointer events pass through background) */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        
        {/* 1. TOP-LEFT COLUMN: Status & Explorer's Codex */}
        <div className="absolute top-6 left-6 z-20 flex flex-col gap-3 items-start pointer-events-auto">
          <StatusHUD />
          <div className="w-[min(380px,38vw)]">
            <ExplorerCodex />
          </div>
        </div>

        {/* 2. TOP-RIGHT: Burn & Flight Controls */}
        <div className="absolute top-6 right-6 z-20 pointer-events-auto w-full max-w-[300px]">
          <BurnControls />
        </div>

        {/* 3. BOTTOM-LEFT COLUMN: Time Warp, Autopilot & Fast Travel */}
        <div className="absolute bottom-6 left-6 z-20 pointer-events-auto flex flex-col gap-2 max-w-[340px]">
          <TimeWarpControls />
          <AutopilotPanel />
          <FastTravelPanel />
        </div>

        {/* 4. BOTTOM-CENTER: Dynamic Caption Box */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-auto w-full max-w-xl px-4">
          <CaptionBox />
        </div>
        
        {/* 5. BOTTOM-RIGHT: Tactical Radar / Minimap */}
        <div className="absolute bottom-6 right-6 z-20 pointer-events-auto">
          <Minimap />
        </div>

        {/* Global Floating Modals */}
        <CodexUnlocker />
        <PauseMenu />

      </div>
    </div>
  );
}