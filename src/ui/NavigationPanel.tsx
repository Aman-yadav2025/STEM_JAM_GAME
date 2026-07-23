import React, { useState } from 'react';
import { useStore } from '../state/store';

export const NavigationPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const bodies = useStore((state) => state.bodies);
  const navigationTargetName = useStore((state) => state.navigationTargetName);
  const setNavigationTarget = useStore((state) => state.setNavigationTarget);

  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-3 bg-slate-900/90 hover:bg-slate-800/90 text-blue-400 px-4 py-2 rounded-xl border border-blue-500/30 shadow-lg backdrop-blur transition font-mono text-xs tracking-wider uppercase w-full"
      >
        <span className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${navigationTargetName ? 'bg-blue-400' : 'bg-slate-600'}`} />
          Navigation: <strong className={navigationTargetName ? 'text-blue-300' : 'text-slate-400'}>{navigationTargetName || 'None'}</strong>
        </span>
        <span className="text-slate-400 text-sm font-bold">{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* Expanded Panel */}
      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 w-64 bg-slate-950/95 text-white p-3 rounded-xl border border-blue-500/40 shadow-2xl backdrop-blur z-30 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between w-full text-[10px] text-slate-400 uppercase tracking-widest px-1 mb-2">
            <span>Navigation Computer</span>
            <button onClick={() => setIsOpen(false)} className="hover:text-white">✕</button>
          </div>
          <div className="mb-3 text-[11px] uppercase tracking-widest text-slate-400">
            {navigationTargetName ? `Dest: ${navigationTargetName}` : 'Select a destination'}
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3 max-h-44 overflow-y-auto pr-1">
            {bodies.map((body) => {
              const isSelected = body.name === navigationTargetName;
              return (
                <button
                  key={body.name}
                  onClick={() => setNavigationTarget(isSelected ? null : body.name)}
                  className={`text-left px-2 py-2 rounded-lg text-xs font-mono transition border ${
                    isSelected
                      ? 'border-blue-400 bg-blue-500/10 text-blue-200'
                      : 'border-slate-700 bg-slate-900/80 text-slate-200 hover:border-blue-500/40 hover:bg-slate-800'
                  }`}
                >
                  {body.name}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Select a body to plot a live manual navigation path to it. 
          </p>
        </div>
      )}
    </div>
  );
};
