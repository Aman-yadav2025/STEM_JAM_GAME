import React, { useEffect } from 'react';
import { useStore } from '../../../state/store';
import { PlanetIcon, type PlanetName } from './PlanetIcon';

export const MissionCompleteAnimation: React.FC = () => {
  const activeCompletedMissionId = useStore((s) => s.activeCompletedMission);
  const setActiveCompletedMission = useStore((s) => s.setActiveCompletedMission);
  const missions = useStore((s) => s.missions);

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (activeCompletedMissionId) {
      const timer = setTimeout(() => {
        setActiveCompletedMission(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [activeCompletedMissionId, setActiveCompletedMission]);

  if (!activeCompletedMissionId) return null;

  const mission = missions.find(m => m.id === activeCompletedMissionId);
  if (!mission) return null;

  const planetStr = ['earth', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].find(p => mission.id.includes(p));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.5s_ease-out]" />
      
      <div className="relative flex flex-col items-center animate-[slideUpFade_0.8s_cubic-bezier(0.16,1,0.3,1)]">
        {/* Decorative holographic rings */}
        <div className="absolute inset-0 rounded-full border border-cyan-500/30 animate-[ping_3s_ease-in-out_infinite] scale-150" />
        <div className="absolute inset-0 rounded-full border-t border-b border-cyan-400/50 animate-[spin_4s_linear_infinite] scale-[1.3]" />

        {/* Planet Icon */}
        <div className="relative mb-6 drop-shadow-[0_0_20px_rgba(34,211,238,0.6)]">
          {planetStr ? (
            <PlanetIcon planet={planetStr as PlanetName} size={160} />
          ) : (
            <div className="w-40 h-40 rounded-full bg-cyan-900/50 flex items-center justify-center border-2 border-cyan-500/50">
              <span className="text-4xl text-cyan-400">?</span>
            </div>
          )}
        </div>

        {/* Text */}
        <div className="text-center bg-black/60 px-8 py-4 rounded-xl border border-cyan-500/30 backdrop-blur-md">
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 mb-2 tracking-[0.2em] uppercase drop-shadow-[0_0_10px_rgba(34,211,238,0.5)] animate-[pulse_2s_ease-in-out_infinite]">
            Mission Accomplished
          </h2>
          <p className="text-cyan-100/90 text-lg tracking-wide uppercase">
            {mission.title}
          </p>
          <div className="mt-3 text-cyan-500/60 text-xs font-mono">
            UPLOADING TELEMETRY... 100%
          </div>
        </div>
      </div>
    </div>
  );
};
