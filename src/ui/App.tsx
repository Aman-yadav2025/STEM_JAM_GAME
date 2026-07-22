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
import GameOverModal from './GameOverModal';

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

  // Flight key handling
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


      {/* UI Overlay - grid to avoid panel overlap */}
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

        {/* Bottom-left: Navigation & Time Controls */}
        <div className="col-start-1 row-start-2 pointer-events-auto flex flex-col gap-4">
          <TimeWarpControls />
          <AutopilotPanel />
          <FastTravelPanel />
        </div>

        {/* Bottom-right: Minimap */}
        <div className="col-start-3 row-start-2 pointer-events-auto self-end justify-self-end">
          <Minimap />
        </div>

        {/* Floating: modal-like components that need to overlay everything */}
        <div className="col-start-2 row-start-1 row-end-3 pointer-events-auto">
          <CodexUnlocker />
          <PauseMenu />
          {gamePhase === 'GameOver' && <GameOverModal />}
        </div>
      </div>
    </div>
  );
}
