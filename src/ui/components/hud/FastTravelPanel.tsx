import React, { useState } from 'react';
import { useStore } from '../../../state/store';

export const FastTravelPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const bodies = useStore((state) => state.bodies);
  const fastTravelToTarget = useStore((state) => state.fastTravelToTarget);

  return (
    <div className="relative w-full min-w-[220px] max-w-[280px]">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 bg-slate-900/90 hover:bg-slate-800/90 text-purple-400 px-4 py-2.5 rounded-xl border border-purple-500/30 shadow-lg backdrop-blur transition font-mono text-xs tracking-[0.15em] uppercase w-full"
      >
        <span className="flex items-center gap-2 truncate min-w-0">
          <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
          <span className="truncate">Fast Travel Matrix</span>
        </span>
        <span className="text-slate-400 text-sm font-bold shrink-0">{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* Expanded Panel */}
      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 w-full bg-slate-950/95 text-white p-3 rounded-xl border border-purple-500/40 shadow-2xl backdrop-blur z-30 animate-in fade-in slide-in-from-bottom-2 duration-200 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between w-full text-[10px] text-slate-400 uppercase tracking-widest px-1 mb-2">
            <span className="truncate">Instant Trajectory Jump</span>
            <button onClick={() => setIsOpen(false)} className="hover:text-white shrink-0">✕</button>
          </div>
          <div className="flex flex-col gap-1.5">
            {bodies.map((body) => (
              <button
                key={body.name}
                onClick={() => {
                  fastTravelToTarget(body.name);
                  setIsOpen(false);
                }}
                className="text-left px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-purple-500/20 hover:border-purple-500/60 rounded-lg text-xs font-mono transition text-slate-200 flex items-center justify-between gap-2 w-full"
              >
                <span className="truncate">{body.name}</span>
                <span className="text-[10px] text-purple-400 uppercase shrink-0">Jump</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};