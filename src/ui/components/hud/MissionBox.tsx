import React, { useState } from 'react';
import { useStore } from '../../../state/store';
import { CornerFrame } from './CornerFrame';

export type MissionTab = 'primary' | 'exploration' | 'classified';

export interface SubTask {
  id: string;
  label: string;
  completed: boolean;
  progress?: number; // 0 to 100
}

export interface Mission {
  id: string;
  tab: MissionTab;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'locked';
  subtasks: SubTask[];
  // Condition evaluator function linking directly to physics store state
  evaluate?: (state: any) => { completed: boolean; subtasks: SubTask[] };
  reward?: string;
}

export function MissionBox() {
  const [activeTab, setActiveTab] = useState<MissionTab>('primary');
  const [isMinimized, setIsMinimized] = useState(false);

  // Pull ship state from Zustand store for live telemetry evaluation
  const ship = useStore((state) => state.ship);
  const bodies = useStore((state) => state.bodies);

  const [missions, setMissions] = useState<Mission[]>([
    {
      id: 'm1',
      tab: 'primary',
      title: 'Phase 1: Escape Atmosphere & Orbit',
      description: 'Establish stable orbital insertion parameters around the primary celestial body.',
      status: 'active',
      subtasks: [
        { id: 'st1', label: 'Escape Lower Stratosphere (>100 km)', completed: false, progress: 0 },
        { id: 'st2', label: 'Achieve Stable Circular Orbit (e < 0.05)', completed: false, progress: 0 },
        { id: 'st3', label: 'Periapsis Altitude > 400 km', completed: false, progress: 0 },
      ],
      evaluate: (storeState) => {
        const s = storeState.ship;
        const altitude = s?.altitude ?? 150; 
        const eccentricity = s?.eccentricity ?? 0.08;
        const periapsis = s?.periapsisAlt ?? 350;

        const st1Done = altitude > 100;
        const st2Done = eccentricity < 0.05;
        const st3Done = periapsis > 400;

        return {
          completed: st1Done && st2Done && st3Done,
          subtasks: [
            { id: 'st1', label: 'Escape Lower Stratosphere (>100 km)', completed: st1Done, progress: Math.min(100, (altitude / 100) * 100) },
            { id: 'st2', label: 'Achieve Stable Circular Orbit (e < 0.05)', completed: st2Done, progress: st2Done ? 100 : Math.max(0, (1 - eccentricity / 0.1) * 100) },
            { id: 'st3', label: 'Periapsis Altitude > 400 km', completed: st3Done, progress: Math.min(100, (periapsis / 400) * 100) },
          ]
        };
      },
      reward: 'Unlock Orbital Maneuver Node Planner'
    },
    {
      id: 'm2',
      tab: 'primary',
      title: 'Phase 2: Interplanetary Transfer Window',
      description: 'Calculate delta-V vector and execute trans-planetary injection burn.',
      status: 'locked',
      subtasks: [
        { id: 'm2_1', label: 'Align Node with Target Body', completed: false, progress: 0 },
        { id: 'm2_2', label: 'Execute Burn (>1200 m/s)', completed: false, progress: 0 },
      ]
    },
    {
      id: 'e1',
      tab: 'exploration',
      title: 'Codex Intel: Scan Planetary Anomalies',
      description: 'Use the deep-space scanner to analyze uncharted celestial surfaces.',
      status: 'active',
      subtasks: [
        { id: 'e1_1', label: 'Target & Scan 3 Unique Bodies', completed: false, progress: 33 },
      ]
    },
    {
      id: 'c1',
      tab: 'classified',
      title: 'PROJECT ARCHIMEDES: Signal Intercept',
      description: '??? [Encrypted deep-space frequency detected in sector 4].',
      status: 'active',
      subtasks: [
        { id: 'c1_1', label: 'Decrypt Deep-Space Comms Signal', completed: false, progress: 10 },
      ]
    }
  ]);

  // Dynamically evaluate live physics conditions on every render / tick
  const evaluatedMissions = missions.map((mission) => {
    if (mission.evaluate && mission.status === 'active') {
      const evaluation = mission.evaluate({ ship, bodies });
      return {
        ...mission,
        status: evaluation.completed ? ('completed' as const) : mission.status,
        subtasks: evaluation.subtasks
      };
    }
    return mission;
  });

  const filteredMissions = evaluatedMissions.filter((m) => m.tab === activeTab);

  return (
    <div className="absolute top-20 right-6 w-96 z-50 pointer-events-auto font-mono select-none">
      <CornerFrame 
        className="rounded-2xl border border-cyan-400/40 bg-[#07121d]/95 p-4 shadow-[0_0_35px_rgba(79,180,232,0.25)] backdrop-blur-md"
        accent="#4FB4E8"
      >
        {/* HEADER & MINIMIZE TOGGLE */}
        <div className="flex justify-between items-center pb-3 mb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-bold tracking-[0.25em] text-cyan-400 uppercase">
              Flight Computer // Objectives
            </span>
          </div>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-[10px] tracking-widest text-cyan-300 hover:text-white bg-cyan-500/20 px-2.5 py-1 rounded-lg uppercase transition pointer-events-auto"
          >
            {isMinimized ? '[Expand]' : '[Minimize]'}
          </button>
        </div>

        {!isMinimized && (
          <>
            {/* STRUCTURED TABS */}
            <div className="grid grid-cols-3 gap-1 mb-4 bg-white/5 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setActiveTab('primary')}
                className={`py-1.5 text-[10px] font-bold tracking-wider rounded-lg uppercase transition ${
                  activeTab === 'primary' 
                    ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(79,180,232,0.5)]' 
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                Primary
              </button>
              <button
                onClick={() => setActiveTab('exploration')}
                className={`py-1.5 text-[10px] font-bold tracking-wider rounded-lg uppercase transition ${
                  activeTab === 'exploration' 
                    ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)]' 
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                Contracts
              </button>
              <button
                onClick={() => setActiveTab('classified')}
                className={`py-1.5 text-[10px] font-bold tracking-wider rounded-lg uppercase transition ${
                  activeTab === 'classified' 
                    ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                Classified
              </button>
            </div>

            {/* MISSIONS LIST */}
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {filteredMissions.length === 0 ? (
                <div className="text-center py-6 text-white/50 text-xs uppercase tracking-widest">
                  No active directives in sector.
                </div>
              ) : (
                filteredMissions.map((mission) => {
                  const isCompleted = mission.status === 'completed';
                  return (
                    <div 
                      key={mission.id}
                      className={`rounded-xl border p-3 transition ${
                        isCompleted 
                          ? 'border-emerald-500/40 bg-emerald-950/20' 
                          : 'border-white/10 bg-white/5 hover:border-cyan-400/40'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          {mission.title}
                        </h4>
                        <span className={`text-[9px] uppercase px-2 py-0.5 rounded font-bold tracking-widest ${
                          isCompleted ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                          mission.status === 'active' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' :
                          'bg-white/10 text-white/50'
                        }`}>
                          {mission.status}
                        </span>
                      </div>

                      <p className="text-[11px] text-white/80 mb-3 leading-relaxed">
                        {mission.description}
                      </p>

                      {/* SUB-TASKS WITH PROGRESS METERS */}
                      <div className="space-y-2 border-t border-white/10 pt-2.5">
                        {mission.subtasks.map((st) => (
                          <div key={st.id} className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span className={st.completed ? 'text-emerald-400 font-semibold' : 'text-white/80'}>
                                {st.completed ? '✓ ' : '• '} {st.label}
                              </span>
                              <span className="text-cyan-400 font-bold">{Math.round(st.progress ?? (st.completed ? 100 : 0))}%</span>
                            </div>
                            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-500 ${st.completed ? 'bg-emerald-400' : 'bg-cyan-400'}`}
                                style={{ width: `${st.progress ?? (st.completed ? 100 : 0)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {mission.reward && isCompleted && (
                        <div className="mt-2.5 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1.5 rounded-lg flex items-center gap-1.5 uppercase font-bold">
                          <span>🎁 REWARD:</span> {mission.reward}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* MINIMIZED SINGLE-LINE STRIP */}
        {isMinimized && (
          <div className="text-[11px] text-white/90 flex justify-between items-center py-1">
            <span className="text-cyan-400">Active Directives:</span>
            <span className="font-bold">
              {evaluatedMissions.filter(m => m.status === 'completed').length} / {evaluatedMissions.length} Completed
            </span>
          </div>
        )}
      </CornerFrame>
    </div>
  );
}