import { useMemo, useState, useEffect } from 'react';
import { G } from '../../../physics/constants';
import { useStore } from '../../../state/store';
import { CornerFrame } from './CornerFrame';
import { ROBOTIC_FACTS, type RoboticFact } from '../../../state/codexFacts';

function calculateTelemetry(body: { name: string; mass: number; radius: number; position: { x: number; y: number; z: number } }, ship: { position: { x: number; y: number; z: number }; velocity: { magnitude: () => number } }) {
  const distance = Math.hypot(body.position.x - ship.position.x, body.position.y - ship.position.y, body.position.z - ship.position.z);
  const safeDistance = Math.max(1, distance);
  const orbitalVelocity = Math.sqrt((G * body.mass) / safeDistance);
  const escapeVelocity = Math.sqrt((2 * G * body.mass) / safeDistance);
  const atmosphericDensity = Math.max(0.01, (body.name === 'Venus' ? 0.95 : body.name === 'Earth' ? 0.42 : body.name === 'Mars' ? 0.18 : body.name === 'Mercury' ? 0.04 : body.name === 'Moon' ? 0.02 : 0.08) * (body.radius / Math.max(safeDistance, body.radius * 1.4)));
  const scanWindow = `${Math.round(body.radius * 1.4)}–${Math.round(body.radius * 3)} u`;

  return {
    distance: Math.round(distance),
    orbitalVelocity: orbitalVelocity.toFixed(2),
    escapeVelocity: escapeVelocity.toFixed(2),
    atmosphericDensity: atmosphericDensity.toFixed(3),
    scanWindow,
  };
}

export function ExplorerCodex() {
  const codexEntries = useStore((state) => state.codexEntries);
  const achievements = useStore((state) => state.achievements);
  const activeScanTargetId = useStore((state) => state.activeScanTargetId);
  const scanProgress = useStore((state) => state.scanProgress);
  const ship = useStore((state) => state.ship);
  const bodies = useStore((state) => state.bodies);

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'telemetry' | 'robotics' | 'achievements'>('telemetry');
  const [currentFactIndex, setCurrentFactIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentFactIndex((prev) => (prev + 1) % ROBOTIC_FACTS.length);
    }, 12000);
    return () => clearInterval(timer);
  }, []);

  const unlockedEntries = useMemo(
    () => codexEntries.filter((entry) => entry.unlocked),
    [codexEntries]
  );
  const activeEntry = codexEntries.find((entry) => entry.id === activeScanTargetId) ?? null;
  const activeBody = bodies.find((body) => body.name === activeEntry?.id) ?? null;
  const activeFact: RoboticFact = ROBOTIC_FACTS[currentFactIndex];

  return (
    <div className="pointer-events-auto absolute top-40 left-4 z-40 font-mono">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3 px-4 py-2.5 rounded-xl bg-black/80 backdrop-blur-md border border-[#A78BFA]/60 text-white shadow-[0_0_20px_rgba(167,139,250,0.25)] transition-all duration-300 hover:border-[#A78BFA] hover:bg-[#A78BFA]/10 hover:scale-[1.02]"
        >
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#A78BFA]/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
          </span>
          <div className="text-left relative">
            <div className="text-[11px] font-extrabold tracking-[0.2em] text-[#A78BFA] drop-shadow-[0_0_6px_rgba(167,139,250,0.4)]">EXPLORER&apos;S CODEX</div>
            <div className="text-[9px] text-white/50 tracking-wider">Neural & Robotic Intel</div>
          </div>
          <span className="relative ml-2 text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded text-cyan-300 border border-white/10">
            {unlockedEntries.length}/{codexEntries.length}
          </span>
        </button>
      ) : (
        <div className="transition-all duration-300 ease-out animate-in fade-in zoom-in-95">
          <CornerFrame className="text-[#E6E9EF] w-[min(380px,calc(100vw-2rem))] max-h-[46vh] overflow-hidden backdrop-blur-md bg-black/85 shadow-2xl border border-white/15" accent="#A78BFA">
            <div className="flex items-center justify-between mb-2 border-b border-white/10 pb-2">
              <div>
                <h2 className="text-sm font-extrabold tracking-[0.25em] text-[#A78BFA] drop-shadow-[0_0_8px_rgba(167,139,250,0.5)]">EXPLORER&apos;S CODEX</h2>
                <p className="text-[9px] text-white/50 uppercase tracking-[0.2em]">Neural Telemetry & Robotic Intel</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right text-[10px] uppercase tracking-[0.2em] text-white/60">
                  <div><span className="text-cyan-400 font-bold">{unlockedEntries.length}</span> / {codexEntries.length}</div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 text-xs font-bold transition border border-white/10"
                  title="Retract Codex"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex gap-1 mb-3 bg-white/5 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setActiveTab('telemetry')}
                className={`flex-1 py-1 text-[10px] uppercase tracking-wider rounded-lg transition-all ${
                  activeTab === 'telemetry' ? 'bg-[#A78BFA]/20 text-[#A78BFA] font-bold border border-[#A78BFA]/40 shadow-inner' : 'text-white/60 hover:text-white'
                }`}
              >
                Telemetry
              </button>
              <button
                onClick={() => setActiveTab('robotics')}
                className={`flex-1 py-1 text-[10px] uppercase tracking-wider rounded-lg transition-all relative ${
                  activeTab === 'robotics' ? 'bg-cyan-400/20 text-cyan-300 font-bold border border-cyan-400/40 shadow-inner' : 'text-white/60 hover:text-white'
                }`}
              >
                Robo-Intel
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
              </button>
              <button
                onClick={() => setActiveTab('achievements')}
                className={`flex-1 py-1 text-[10px] uppercase tracking-wider rounded-lg transition-all ${
                  activeTab === 'achievements' ? 'bg-amber-400/20 text-amber-300 font-bold border border-amber-400/40 shadow-inner' : 'text-white/60 hover:text-white'
                }`}
              >
                Badges ({achievements.filter(a => a.unlocked).length})
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1 pb-1 text-sm max-h-[26vh] scrollbar-thin">
              {activeTab === 'telemetry' && (
                <>
                  {activeEntry && activeBody && !activeEntry.unlocked ? (
                    <div className="rounded-2xl border border-cyan-400/40 bg-cyan-950/30 p-3 shadow-lg animate-pulse">
                      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-cyan-300 font-semibold">
                        <span>ACTIVE SENSOR SWEEP</span>
                        <span className="text-[10px]">{scanProgress}%</span>
                      </div>
                      <div className="mt-2 text-[13px] text-white font-bold">{activeEntry.title}</div>
                      <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-200" style={{ width: `${scanProgress}%` }} />
                      </div>
                      <p className="mt-2 text-[11px] leading-relaxed text-white/70">Hold stable orbit inside the scan corridor to parse planetary code.</p>
                    </div>
                  ) : null}

                  {unlockedEntries.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center text-[12px] text-white/70">
                      <div className="text-cyan-400 font-semibold mb-1">System Awaiting Data</div>
                      Enter a celestial body&apos;s sphere of influence to initiate automated sensor sweeps.
                    </div>
                  ) : (
                    unlockedEntries.map((entry) => {
                      const body = bodies.find((candidate) => candidate.name === entry.id) ?? null;
                      const telemetryData = body ? calculateTelemetry(body as never, ship as never) : null;
                      return (
                        <div key={entry.id} className="rounded-2xl border border-white/15 bg-white/5 p-3 transition hover:border-[#A78BFA]/50 hover:bg-white/10">
                          <div className="flex items-center justify-between">
                            <span className="text-xs uppercase tracking-[0.2em] text-[#EDE9FE] font-bold">{entry.title}</span>
                            <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Verified</span>
                          </div>
                          <p className="mt-2 text-[12px] leading-relaxed text-white/80">{entry.description}</p>
                          {telemetryData ? (
                            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-white/80">
                              <div className="rounded-lg bg-black/30 p-2 border border-white/5">
                                <div className="text-white/40 text-[10px]">Orbital Velocity</div>
                                <div className="font-semibold text-cyan-300">{telemetryData.orbitalVelocity} u/s</div>
                              </div>
                              <div className="rounded-lg bg-black/30 p-2 border border-white/5">
                                <div className="text-white/40 text-[10px]">Escape Velocity</div>
                                <div className="font-semibold text-purple-300">{telemetryData.escapeVelocity} u/s</div>
                              </div>
                              <div className="rounded-lg bg-black/30 p-2 border border-white/5">
                                <div className="text-white/40 text-[10px]">Atmosphere</div>
                                <div className="font-semibold text-white/90">{telemetryData.atmosphericDensity}</div>
                              </div>
                              <div className="rounded-lg bg-black/20 p-2 border border-white/5">
                                <div className="text-white/40 text-[10px]">Scan Window</div>
                                <div className="font-semibold text-white/90">{telemetryData.scanWindow}</div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {activeTab === 'robotics' && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-950/40 to-black p-3.5 relative overflow-hidden">
                    <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl pointer-events-none"></div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-cyan-400 font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                        LIVE ROBO-INTEL FEED
                      </span>
                      <span className="text-[9px] text-white/40 uppercase tracking-widest">[{activeFact?.category}]</span>
                    </div>
                    <h3 className="text-xs font-bold text-white mt-2 tracking-wide">{activeFact?.title}</h3>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-white/80">{activeFact?.fact}</p>
                    
                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/10 text-[10px] text-white/50">
                      <span>Auto-cycling telemetry archive</span>
                      <button 
                        onClick={() => setCurrentFactIndex((prev) => (prev + 1) % ROBOTIC_FACTS.length)}
                        className="text-cyan-300 hover:text-cyan-200 underline uppercase tracking-wider"
                      >
                        Next Fact →
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-[11px] text-white/70">
                    <span className="text-purple-300 font-semibold">Did you know?</span> Advanced automated control loops run at over 1,000Hz on deep space probes to stabilize attitude against solar wind pressure.
                  </div>
                </div>
              )}

              {activeTab === 'achievements' && (
                <div className="space-y-2">
                  {achievements.length > 0 ? (
                    achievements.map((achievement) => (
                      <div key={achievement.id} className="rounded-xl border border-white/10 bg-black/20 p-2.5">
                        <div className="flex items-center justify-between gap-2 text-[12px]">
                          <span className="font-semibold text-white/90">{achievement.title}</span>
                          <span className={`text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 rounded ${
                            achievement.unlocked ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/5 text-white/50'
                          }`}>
                            {achievement.unlocked ? 'Unlocked' : `${Math.round((achievement.progress / achievement.target) * 100)}%`}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-white/70">{achievement.description}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center text-[12px] text-white/70">
                      No telemetry badges recorded yet. Explore and fulfill mission milestones to unlock!
                    </div>
                  )}
                </div>
              )}
            </div>
          </CornerFrame>
        </div>
      )}
    </div>
  );
}