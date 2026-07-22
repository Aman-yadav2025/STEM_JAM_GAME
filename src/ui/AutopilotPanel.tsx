import React, { useState } from 'react';
import { useStore } from '../state/store';

export const AutopilotPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const autopilotEnabled = useStore((state) => state.autopilotEnabled);
  const toggleAutopilot = useStore((a) => a.toggleAutopilot);

  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-3 bg-slate-900/90 hover:bg-slate-800/90 text-emerald-400 px-4 py-2 rounded-xl border border-emerald-500/30 shadow-lg backdrop-blur transition font-mono text-xs tracking-wider uppercase w-full"
      >
        <span className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${autopilotEnabled ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
          Autopilot: <strong className={autopilotEnabled ? 'text-emerald-300' : 'text-slate-400'}>{autopilotEnabled ? 'ENGAGED' : 'STANDBY'}</strong>
        </span>
        <span className="text-slate-400 text-sm font-bold">{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* Expanded Panel */}
      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 w-64 bg-slate-950/95 text-white p-3 rounded-xl border border-emerald-500/40 shadow-2xl backdrop-blur z-30 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between w-full text-[10px] text-slate-400 uppercase tracking-widest px-1 mb-2">
            <span>Nav Computer Systems</span>
            <button onClick={() => setIsOpen(false)} className="hover:text-white">✕</button>
          </div>
          <button
            onClick={toggleAutopilot}
            className={`w-full py-2 px-3 rounded-lg font-mono text-xs uppercase font-bold tracking-wider transition shadow-md ${
              autopilotEnabled
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-black'
            }`}
          >
            {autopilotEnabled ? 'Disengage Autopilot' : 'Engage Orbital AP'}
          </button>
        </div>
      )}
    </div>
  );
};