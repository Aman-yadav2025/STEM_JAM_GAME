import React, { useState } from 'react';
import { type AutopilotStatus } from '../physics/autopilot';
import { useStore } from '../state/store';

export const AutopilotPanel: React.FC = () => {
  // Grab store data and actions
  const bodies = useStore((state) => state.bodies);
  const autopilotTargetName = useStore((state) => state.autopilotTargetName);
  const autopilotStatus = useStore((state) => state.autopilotStatus);
  const setAutopilotTarget = useStore((state) => state.setAutopilotTarget);
  const setAutopilotEnabled = useStore((state) => state.setAutopilotEnabled);
  const cancelAutopilot = useStore((state) => state.cancelAutopilot);

  // Local state for destination selection before pressing "Go"
  const [selectedDestination, setSelectedDestination] = useState<string>('');

  // Exclude Sun/Central Star from travel destinations
  const destinationOptions = bodies.filter((b) => b.name !== 'Sun');

  const handleEngage = () => {
    if (selectedDestination) {
      setAutopilotTarget(selectedDestination);
      setAutopilotEnabled(true);
      setSelectedDestination('');
    }
  };

  const handleDisengage = () => {
    cancelAutopilot();
    setSelectedDestination('');
  };

  const renderStatusBadge = (status: AutopilotStatus) => {
    switch (status) {
      case 'CRUISING':
        return <span className="text-amber-400 font-semibold animate-pulse">Cruising to Target</span>;
      case 'ESCAPING':
        return <span className="text-purple-400 font-semibold animate-pulse">Escaping Orbit</span>;
      case 'CAPTURING':
        return <span className="text-cyan-400 font-semibold animate-pulse">Capture Burn</span>;
      case 'STABLE_ORBIT':
        return <span className="text-emerald-400 font-bold">In Stable Orbit</span>;
      default:
        return <span className="text-slate-400">Standby</span>;
    }
  };

  return (
    <div className="pointer-events-auto bg-slate-900/90 text-white p-4 rounded-xl border border-slate-700 shadow-2xl backdrop-blur w-72 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Autopilot Computer
          </span>
        </div>
        {autopilotTargetName && (
          <span className="text-[10px] bg-indigo-950 border border-indigo-700 text-indigo-300 px-2 py-0.5 rounded-full font-mono">
            ENGAGED
          </span>
        )}
      </div>

      {/* Mode A: Select Target and Go */}
      {!autopilotTargetName ? (
        <div className="flex flex-col gap-2.5">
          <label className="text-[11px] font-medium text-slate-400">
            Select Destination:
          </label>
          
          <div className="flex gap-2">
            <select
              value={selectedDestination}
              onChange={(e) => setSelectedDestination(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-600 text-white text-xs rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
            >
              <option value="">-- Pick Planet / Moon --</option>
              {destinationOptions.map((body) => (
                <option key={body.name} value={body.name}>
                  {body.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleEngage}
              disabled={!selectedDestination}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all shadow-md flex items-center justify-center gap-1 ${
                selectedDestination
                  ? 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              🚀 Go
            </button>
          </div>
        </div>
      ) : (
        /* Mode B: Active Flight Status & Disengage */
        <div className="flex flex-col gap-2.5">
          <div className="bg-slate-950/70 rounded-lg p-2.5 border border-slate-800 flex flex-col gap-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Destination:</span>
              <span className="font-bold text-indigo-300">{autopilotTargetName}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Status:</span>
              {renderStatusBadge(autopilotStatus)}
            </div>
          </div>

          <button
            onClick={handleDisengage}
            className="w-full bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-bold py-2 px-3 rounded-lg border border-rose-500 transition-all active:scale-95 shadow-lg flex items-center justify-center gap-1.5"
          >
            🛑 Disengage Autopilot
          </button>
        </div>
      )}
    </div>
  );
};