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

export default function App() {
  const gamePhase = useStore((state) => state.gamePhase);
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
            label: 'Planet Hazards',
            handler: () =>
              showGameCaption(
                'Venus is the Pressure Cooker: a deep-heat zone where sensors overheat and only shielded ships survive. Uranus is the Sideways Spinner: erratic gravitation can flip your controls mid-flight.',
                'tip'
              ),
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