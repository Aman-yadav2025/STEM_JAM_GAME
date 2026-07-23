import React, { useState } from 'react';
import { useStore, WARP_STEPS, getDisplayWarpValue, type GameState } from '../state/store';

export const TimeWarpControls: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const timeWarp = useStore((state: GameState) => state.timeWarp);
  const setTimeWarp = useStore((state: GameState) => state.setTimeWarp);
  const increaseTimeWarp = useStore((state: GameState) => state.increaseTimeWarp);
  const decreaseTimeWarp = useStore((state: GameState) => state.decreaseTimeWarp);
  const resetTimeWarp = useStore((state: GameState) => state.resetTimeWarp);

  return (
    <div className="relative w-full min-w-[220px] max-w-[280px]">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 bg-slate-900/90 hover:bg-slate-800/90 text-cyan-400 px-4 py-2.5 rounded-xl border border-cyan-500/30 shadow-lg backdrop-blur transition font-mono text-xs tracking-[0.15em] uppercase w-full"
      >
        <span className="flex items-center gap-2 truncate min-w-0">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
          <span className="truncate">Warp: <strong className="text-white">{getDisplayWarpValue(timeWarp)}x</strong></span>
        </span>
        <span className="text-slate-400 text-sm font-bold shrink-0">{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* Expanded Control Panel */}
      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 w-full flex flex-col items-center gap-2 bg-slate-950/95 text-white p-3 rounded-xl border border-cyan-500/40 shadow-2xl backdrop-blur z-30 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between w-full text-[10px] text-slate-400 uppercase tracking-widest px-1">
            <span className="truncate">Simulation Speed</span>
            <button onClick={() => setIsOpen(false)} className="hover:text-white shrink-0">✕</button>
          </div>

          <div className="flex items-center justify-center gap-2 w-full">
            <button
              onClick={decreaseTimeWarp}
              disabled={timeWarp === WARP_STEPS[0]}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded text-sm font-bold transition text-cyan-300 shrink-0"
              title="Decrease Speed"
            >
              «
            </button>

            <button
              onClick={resetTimeWarp}
              className="flex-1 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-xs font-semibold transition flex items-center justify-center gap-1 shadow-md truncate px-2"
              title="Reset to 1x Speed"
            >
              <span className="truncate">{getDisplayWarpValue(timeWarp)}x</span>
              {timeWarp !== WARP_STEPS[2] && <span className="text-[10px] opacity-75 shrink-0">(Reset)</span>}
            </button>

            <button
              onClick={increaseTimeWarp}
              disabled={timeWarp === WARP_STEPS[WARP_STEPS.length - 1]}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded text-sm font-bold transition text-cyan-300 shrink-0"
              title="Increase Speed"
            >
              »
            </button>
          </div>

          <div className="grid grid-cols-5 gap-1 w-full pt-1">
            {WARP_STEPS.map((step) => (
              <button
                key={step}
                onClick={() => setTimeWarp(step)}
                className={`py-1 text-[10px] rounded transition font-mono text-center truncate px-1 ${
                  timeWarp === step
                    ? 'bg-cyan-400 text-black font-bold shadow-md scale-105'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                {getDisplayWarpValue(step)}x
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};