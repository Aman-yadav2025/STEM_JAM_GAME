import React from 'react';
import { useStore, WARP_STEPS } from '../state/store';

export const TimeWarpControls: React.FC = () => {
  const timeWarp = useStore((state) => state.timeWarp);
  const setTimeWarp = useStore((state) => state.setTimeWarp);
  const increaseTimeWarp = useStore((state) => state.increaseTimeWarp);
  const decreaseTimeWarp = useStore((state) => state.decreaseTimeWarp);
  const resetTimeWarp = useStore((state) => state.resetTimeWarp);

  return (
    <div className="flex flex-col items-center gap-2 bg-slate-900/90 text-white p-3 rounded-xl border border-slate-700 shadow-lg backdrop-blur">
      <div className="flex items-center gap-2">
        {/* Step Down Button */}
        <button
          onClick={decreaseTimeWarp}
          disabled={timeWarp === WARP_STEPS[0]}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded text-sm font-bold transition"
          title="Decrease Speed"
        >
          «
        </button>

        {/* Reset / Current Speed Display */}
        <button
          onClick={resetTimeWarp}
          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-semibold transition flex items-center gap-1"
          title="Reset to 1x Speed"
        >
          <span>{timeWarp}x</span>
          {timeWarp !== 1 && <span className="text-xs opacity-75">(Reset)</span>}
        </button>

        {/* Step Up Button */}
        <button
          onClick={increaseTimeWarp}
          disabled={timeWarp === WARP_STEPS[WARP_STEPS.length - 1]}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded text-sm font-bold transition"
          title="Increase Speed"
        >
          »
        </button>
      </div>

      {/* Direct Speed Selection Bar */}
      <div className="flex items-center gap-1">
        {WARP_STEPS.map((step) => (
          <button
            key={step}
            onClick={() => setTimeWarp(step)}
            className={`px-2 py-0.5 text-xs rounded transition font-mono ${
              timeWarp === step
                ? 'bg-emerald-500 text-black font-bold shadow-md scale-105'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            {step}x
          </button>
        ))}
      </div>
    </div>
  );
};