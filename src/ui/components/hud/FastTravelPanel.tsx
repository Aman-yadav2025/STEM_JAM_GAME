import React, { useState } from 'react';
import { useStore } from '../../../state/store';

export const FastTravelPanel: React.FC = () => {
  const bodies = useStore((state) => state.bodies);
  const fastTravelToTarget = useStore((state) => state.fastTravelToTarget);

  const [selectedDestination, setSelectedDestination] = useState<string>('');

  // Filter out the Sun if you don't want to allow teleporting directly into it
  const destinationOptions = bodies.filter((b) => b.name !== 'Sun');

  const handleTeleport = () => {
    if (selectedDestination) {
      fastTravelToTarget(selectedDestination);
    }
  };

  return (
    <div className="absolute top-20 right-4 w-64 bg-slate-900/90 border border-slate-700 rounded-lg p-4 text-white shadow-xl backdrop-blur-sm z-50">
      <h3 className="text-sm font-bold text-slate-300 mb-3 border-b border-slate-700 pb-2 flex items-center gap-2">
        <span>⚡</span> Fast Travel System
      </h3>

      <div className="flex flex-col gap-3">
        <select
          value={selectedDestination}
          onChange={(e) => setSelectedDestination(e.target.value)}
          className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded px-3 py-2 outline-none cursor-pointer focus:border-amber-500 transition-colors"
        >
          <option value="">-- Select Destination --</option>
          {destinationOptions.map((body) => (
            <option key={body.name} value={body.name}>
              {body.name}
            </option>
          ))}
        </select>

        <button
          onClick={handleTeleport}
          disabled={!selectedDestination}
          className="w-full py-2 text-sm font-bold rounded bg-amber-600 hover:bg-amber-500 text-white disabled:bg-slate-800 disabled:text-slate-600 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <span>✨</span> Engage Warp
        </button>
      </div>
    </div>
  );
};