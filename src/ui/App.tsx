import { useEffect } from 'react';
import React from 'react';
import {MainMenu}  from './MainMenu';
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

export default function App() {
  const gamePhase = useStore((state) => state.gamePhase);
  const togglePaused = useStore((state) => state.togglePaused);

// Only trigger the intro caption when entering the 'playing' phase
  useEffect(() => {
    if (gamePhase === 'Playing') {
      showGameCaption(
        'System online. Tap a burn direction to begin steering, then hold throttle to ignite. Your first objective: escape low orbit and intercept the transfer window.',
        'info',
        [
          {
            label: 'Planet Hazards',
            handler: () => showGameCaption(
              'Venus is the Pressure Cooker: a deep-heat zone where sensors overheat and only shielded ships survive. Uranus is the Sideways Spinner: erratic gravitation can flip your controls mid-flight.',
              'tip'
            ),
          },
          {
            label: 'Deep-Space Lore',
            handler: () => showGameCaption(
              'Brown dwarfs are failed stars in the cold dark. Perspective tricks make distant objects appear close, and micrometeoroids mean hull checks matter in every mission.',
              'tip'
            ),
          },
          {
            label: 'Star Navigation',
            handler: () => showGameCaption(
              'Constellations are sky-region waypoints, not real clusters. Calibrate your nav-computer by star-hopping through known patterns and discover alien names for the same star fields.',
              'tip'
            ),
          },
        ]
      );
    }
  }, [gamePhase]);

  // Only allow pausing via Escape key if currently playing
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && gamePhase === 'Playing') {
        togglePaused();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePaused, gamePhase]);

  if (gamePhase === 'menu') {
    return <MainMenu />;
  }

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* 3D Render Layer */}
      <div className="absolute inset-0 z-0">
        <SceneManager />
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none p-6">
        <div className="flex h-full gap-6">
          <div className="flex flex-1 flex-col justify-between gap-4">
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

          <div className="pointer-events-auto w-full max-w-[320px] self-start">
            <BurnControls />
          </div>
        </div>

        <CodexUnlocker />
        <PauseMenu />
        <div className="absolute bottom-6 right-6 z-20 pointer-events-auto">
          <Minimap />
        </div>
        <div className="pointer-events-auto absolute bottom-5 left-5">
        <TimeWarpControls />
      </div>
      </div>
    </div>
  );
}