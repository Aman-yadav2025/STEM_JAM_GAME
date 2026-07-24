import { useState, useEffect, useRef } from 'react';
import { CornerFrame } from './CornerFrame';
import { useStore } from '../../../state/store';
import { PlanetIcon } from './PlanetIcon';
const astronautAvatar = '/assets/media__1784923306345.jpg';

export type CaptionType = 'info' | 'warning' | 'success' | 'tip' | 'critical';

export type CaptionAction = {
  label: string;
  handler: () => void;
};

interface CaptionBoxProps {
  factText?: string;
  isVisible?: boolean;
  type?: CaptionType;
  actions?: CaptionAction[];
}

type CaptionPayload = {
  id: string;
  text: string;
  type: CaptionType;
  actions?: CaptionAction[];
  timestamp: string;
};

type MissionTab = 'comms' | 'primary' | 'exploration' | 'classified';



declare global {
  interface Window {
    __gameCaptionLast?: CaptionPayload;
    __gameCaptionHistory?: CaptionPayload[];
    __shipTelemetry?: {
      eccentricity?: number;
      periapsisAltitude?: number;
      apoapsis?: number;
      velocity?: number;
      distanceToLunaMinor?: number;
      currentBody?: string;
    };
  }
}

const TYPE_CONFIG: Record<CaptionType, { label: string; color: string; textStyle: string; border: string; glow: string }> = {
  info: { 
    label: 'MISSION CONTROL / DATA', 
    color: '#4FB4E8', 
    textStyle: 'text-[#4FB4E8]',
    border: 'border-cyan-400/40',
    glow: '0 0 35px rgba(79, 180, 232, 0.28)'
  },
  warning: { 
    label: 'CRITICAL ALERT / DYNAMICS', 
    color: '#EF4444', 
    textStyle: 'text-red-500',
    border: 'border-red-500/60',
    glow: '0 0 40px rgba(239, 68, 68, 0.35)'
  },
  success: { 
    label: 'MISSION OBJECTIVE MET', 
    color: '#10B981', 
    textStyle: 'text-emerald-500',
    border: 'border-emerald-500/50',
    glow: '0 0 35px rgba(16, 185, 129, 0.3)'
  },
  tip: { 
    label: 'FLIGHT COMPUTER / TIP', 
    color: '#F59E0B', 
    textStyle: 'text-amber-500',
    border: 'border-amber-500/50',
    glow: '0 0 35px rgba(245, 158, 11, 0.3)'
  },
  critical: {
    label: 'SYSTEM CRITICAL / ALERT',
    color: '#DC2626',
    textStyle: 'text-red-500',
    border: 'border-red-500/70',
    glow: '0 0 40px rgba(220, 38, 38, 0.35)',
  },
};

/**
 * Global helper function to trigger an educational caption with history logging from anywhere!
 */
export function showGameCaption(text: string, type: CaptionType = 'info', actions: CaptionAction[] = []) {
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const payload: CaptionPayload = {
    id: Math.random().toString(36).substring(2, 9),
    text,
    type,
    actions,
    timestamp
  };

  window.__gameCaptionLast = payload;

  if (typeof window !== 'undefined') {
    if (!window.__gameCaptionHistory) {
      window.__gameCaptionHistory = [];
    }
    window.__gameCaptionHistory.unshift(payload);
    if (window.__gameCaptionHistory.length > 25) {
      window.__gameCaptionHistory.pop();
    }
  }

  window.dispatchEvent(new CustomEvent('show-game-caption', { detail: payload }));
}

export function CaptionBox({ 
  factText: initialText = '', 
  isVisible: initialVisible = false, 
  type: initialType = 'info',
  actions: initialActions = [],
}: CaptionBoxProps) {
  const [text, setText] = useState(() => {
    if (initialText) return initialText;
    if (typeof window !== 'undefined') {
      return window.__gameCaptionLast?.text ?? '';
    }
    return '';
  });
  const [visible, setVisible] = useState(() => {
    if (initialVisible || initialText) return true;
    if (typeof window !== 'undefined') {
      return Boolean(window.__gameCaptionLast);
    }
    return false;
  });
  const [currentType, setCurrentType] = useState<CaptionType>(() => {
    if (initialType) return initialType;
    if (typeof window !== 'undefined') {
      return window.__gameCaptionLast?.type ?? 'info';
    }
    return 'info';
  });
  const [actions, setActions] = useState<CaptionAction[]>(() => {
    if (initialActions.length) return initialActions;
    if (typeof window !== 'undefined') {
      return window.__gameCaptionLast?.actions ?? [];
    }
    return [];
  });

  const [displayedText, setDisplayedText] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  
  // Mission Control Drawer & Tabs State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<MissionTab>('primary');
  const [historyLogs, setHistoryLogs] = useState<CaptionPayload[]>([]);
  
  // Fixed Back Button State Index (0 means current/latest message)
  const [historyIndex, setHistoryIndex] = useState(0);

  // Rolling telemetry number generator state for holographic HUD immersion
  const [rollingHex, setRollingHex] = useState('0xF4A2');
  const [flickerValue, setFlickerValue] = useState('99.8%');

  const missions = useStore((state) => state.missions);
  const acceptMission = useStore((state) => state.acceptMission);
  const decryptMission = useStore((state) => state.decryptMission);
  const claimMissionReward = useStore((state) => state.claimMissionReward);
  const evaluateMissions = useStore((state) => state.evaluateMissions);

  const primaryMissions = missions.filter(m => m.type === 'primary');
  const explorationContracts = missions.filter(m => m.type === 'exploration');
  const classifiedGoals = missions.filter(m => m.type === 'classified');

  const typingTimeoutRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lunaWarningTriggeredRef = useRef<boolean>(false);

  const config = TYPE_CONFIG[currentType as CaptionType] || TYPE_CONFIG.info;

  // Web Audio API procedural text click synthesizer
  const playCommsTick = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200 + Math.random() * 400, ctx.currentTime);
      
      gain.gain.setValueAtTime(0.012, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.02);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.02);
    } catch {
      // Audio fallback
    }
  };

  // Sync history logs on mount / update
  useEffect(() => {
    if (typeof window !== 'undefined' && window.__gameCaptionHistory) {
      setHistoryLogs([...window.__gameCaptionHistory]);
    }
  }, [visible, text]);

  // Micro-animations: rolling numbers and flickering data feeds ticker
  useEffect(() => {
    const tickerInterval = setInterval(() => {
      const hexChars = '0123456789ABCDEF';
      let randHex = '0x';
      for (let i = 0; i < 4; i++) {
        randHex += hexChars[Math.floor(Math.random() * hexChars.length)];
      }
      setRollingHex(randHex);
      setFlickerValue((98 + Math.random() * 1.9).toFixed(1) + '%');
    }, 350);
    return () => clearInterval(tickerInterval);
  }, []);

  // Live Physics Store Evaluator & Environmental Comms Chatter Monitor
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof window === 'undefined' || !window.__shipTelemetry) return;
      const tel = window.__shipTelemetry;

      if (tel.distanceToLunaMinor !== undefined && tel.distanceToLunaMinor < 1500 && !lunaWarningTriggeredRef.current) {
        lunaWarningTriggeredRef.current = true;
        showGameCaption(
          '[STATIC TRANSMISSION] — Warning: Entering Luna Minor gravity well. Unidentified gravitational fluctuations detected. Pre-collapse telemetry suggests abandoned relay stations nearby.',
          'warning'
        );
      }
      
      evaluateMissions(tel);

    }, 1000);

    return () => clearInterval(interval);
  }, [evaluateMissions]);

  // Global event listener
  useEffect(() => {
    const handleGlobalCaption = (e: Event) => {
      const customEvent = e as CustomEvent<CaptionPayload>;
      if (customEvent.detail) {
        setText(customEvent.detail.text);
        setCurrentType(customEvent.detail.type || 'info');
        setActions(customEvent.detail.actions ?? []);
        setVisible(true);
        setHistoryIndex(0); // Reset index when a new caption arrives
        if (typeof window !== 'undefined' && window.__gameCaptionHistory) {
          setHistoryLogs([...window.__gameCaptionHistory]);
        }
      }
    };

    window.addEventListener('show-game-caption', handleGlobalCaption);

    const pendingCaption = window.__gameCaptionLast;
    if (pendingCaption) {
      setText(pendingCaption.text);
      setCurrentType(pendingCaption.type || 'info');
      setActions(pendingCaption.actions ?? []);
      setVisible(true);
      setHistoryIndex(0);
    }

    return () => window.removeEventListener('show-game-caption', handleGlobalCaption);
  }, []);

  // Typewriter Engine with Randomized Micro-Pauses
  useEffect(() => {
    if (!visible || !text) {
      setDisplayedText('');
      setIsTypingComplete(false);
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      return;
    }

    setDisplayedText('');
    setIsTypingComplete(false);
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    let index = 0;

    const typeNextChar = () => {
      if (index < text.length) {
        setDisplayedText(text.substring(0, index + 1));
        playCommsTick();
        index++;

        const char = text[index - 1];
        let delay = 20 + Math.random() * 25;
        if (char === '.' || char === ',') delay += 160;

        typingTimeoutRef.current = window.setTimeout(typeNextChar, delay);
      } else {
        setIsTypingComplete(true);
        typingTimeoutRef.current = null;
      }
    };

    typingTimeoutRef.current = window.setTimeout(typeNextChar, 100);

    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [text, visible]);

  const handleBoxClick = () => {
    if (!isTypingComplete) {
      setDisplayedText(text);
      setIsTypingComplete(true);
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      return;
    }
    setVisible(false);
  };

  // If dismissed, render a sleek persistent button to bring the last caption back instantly!
  if (!visible) {
    return (
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-100 pointer-events-auto font-mono select-none">
        <button
          type="button"
          onClick={() => {
            if (window.__gameCaptionLast) {
              setText(window.__gameCaptionLast.text);
              setCurrentType(window.__gameCaptionLast.type || 'info');
              setActions(window.__gameCaptionLast.actions ?? []);
              setHistoryIndex(0);
            }
            setVisible(true);
            setIsDrawerOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-cyan-400/40 bg-[#07121d]/90 text-cyan-400 text-xs font-bold uppercase tracking-[0.2em] shadow-[0_0_25px_rgba(79,180,232,0.35)] backdrop-blur-xl hover:bg-cyan-500/20 transition active:scale-95 pointer-events-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          [ Open Mission Control / Comms ]
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-6 left-[48%] -translate-x-1/2 w-[min(94vw,680px)] z-100 pointer-events-auto font-mono select-none">
      
      {/* STRUCTURED MISSION CONTROL & COMMS DRAWER */}
      {isDrawerOpen && (
        <div className="mb-3 rounded-2xl border border-white/20 bg-[#07121d]/90 p-4 shadow-[0_0_35px_rgba(0,0,0,0.85)] backdrop-blur-xl max-h-80 overflow-y-auto animate-in fade-in duration-200 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40" />

          <div className="flex justify-between items-center pb-2 mb-3 border-b border-white/10 relative z-10">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[11px] font-bold tracking-[0.25em] text-cyan-400 uppercase">
                Mission Control Database [{rollingHex}]
              </span>
            </div>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="text-[10px] tracking-widest text-white/70 hover:text-white bg-white/10 px-2.5 py-1 rounded-lg uppercase transition"
            >
              [Close Panel]
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5 mb-3 relative z-10">
            {[
              { id: 'primary', label: 'Directives' },
              { id: 'exploration', label: 'Contracts' },
              { id: 'classified', label: 'Classified' },
              { id: 'comms', label: 'Comms Log' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as MissionTab)}
                className={`py-1.5 px-2 rounded-xl text-[10px] uppercase font-semibold tracking-wider transition ${
                  activeTab === tab.id
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400/40'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'primary' && (
            <div className="space-y-2.5 relative z-10">
              {primaryMissions.map((m) => (
                <div key={m.id} className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-white flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${m.status === 'completed' || m.status === 'reward_claimed' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                      {m.title}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded ${m.status === 'completed' || m.status === 'reward_claimed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {m.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="flex gap-3 items-center mb-2">
                    {(() => {
                      const planetStr = ['earth', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].find(p => m.id.includes(p));
                      return planetStr ? <PlanetIcon planet={planetStr as any} size={48} className="shrink-0" /> : null;
                    })()}
                    <div className="flex-1">
                  <p className="text-white/80 leading-snug mb-1">{m.description}</p>
                  <div className="text-[10px] text-cyan-400/80 font-mono">Telemetry: {m.progressText}</div>
                  
                  {m.status === 'completed' && (
                    <button onClick={() => claimMissionReward(m.id)} className="mt-2 w-full py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-[10px] tracking-widest uppercase hover:bg-emerald-500/20 transition active:scale-95 pointer-events-auto">
                      Claim Reward: {m.rewardDescription}
                    </button>
                  )}
                  </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'exploration' && (
            <div className="space-y-2.5 relative z-10">
              {explorationContracts.map((m) => (
                <div key={m.id} className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-white flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${m.status === 'completed' || m.status === 'reward_claimed' ? 'bg-emerald-400' : 'bg-cyan-400'}`} />
                      {m.title}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded ${m.status === 'completed' || m.status === 'reward_claimed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                      {m.status.toUpperCase()}
                    </span>
                  </div>
                  
                  {m.status === 'available' ? (
                    <div className="mt-1">
                      <p className="text-white/60 italic text-[10px] mb-2">New contract available for acquisition.</p>
                      <button onClick={() => acceptMission(m.id)} className="w-full py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-400 text-[10px] tracking-widest uppercase hover:bg-cyan-500/20 transition active:scale-95 pointer-events-auto">
                        Accept Contract
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-white/80 leading-snug mb-1">{m.description}</p>
                      <div className="text-[10px] text-cyan-400/80 font-mono">Status: {m.progressText}</div>
                      
                      {m.status === 'completed' && (
                        <button onClick={() => claimMissionReward(m.id)} className="mt-2 w-full py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-[10px] tracking-widest uppercase hover:bg-emerald-500/20 transition active:scale-95 pointer-events-auto">
                          Claim Reward: {m.rewardDescription}
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'classified' && (
            <div className="space-y-2.5 relative z-10">
              {classifiedGoals.map((m) => (
                <div key={m.id} className="p-2.5 rounded-xl border border-purple-500/20 bg-purple-950/20 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-purple-300 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                      {m.status === 'locked' ? 'ENCRYPTED DATA' : m.title}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                      CLASSIFIED
                    </span>
                  </div>
                  
                  {m.status === 'locked' ? (
                    <div className="mt-1">
                      <p className="text-purple-300/60 font-mono text-[10px] mb-2">0x4F 0xA1 0x99 ... Data requires decryption sequence.</p>
                      <button onClick={() => decryptMission(m.id)} className="w-full py-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 text-purple-300 text-[10px] tracking-widest uppercase hover:bg-purple-500/30 transition active:scale-95 pointer-events-auto flex justify-center items-center gap-2">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                        Decrypt Protocol
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-white/80 leading-snug mb-1">{m.description}</p>
                      <div className="text-[10px] text-purple-400/80 font-mono">{m.progressText}</div>
                      
                      {m.status === 'completed' && (
                        <button onClick={() => claimMissionReward(m.id)} className="mt-2 w-full py-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 text-purple-300 text-[10px] tracking-widest uppercase hover:bg-purple-500/30 transition active:scale-95 pointer-events-auto">
                          Extract Anomaly Data
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'comms' && (
            <div className="space-y-2.5 relative z-10">
              {historyLogs.map((log, logIdx) => {
                const logConf = TYPE_CONFIG[log.type as CaptionType] || TYPE_CONFIG.info;
                return (
                  <div 
                    key={log.id} 
                    onClick={() => {
                      setText(log.text);
                      setCurrentType(log.type);
                      setActions(log.actions ?? []);
                      setHistoryIndex(logIdx);
                      setIsDrawerOpen(false);
                    }}
                    className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition cursor-pointer text-xs"
                  >
                    <div className="flex justify-between items-center mb-1 text-[9px] opacity-75">
                      <span className={logConf.textStyle}>{logConf.label}</span>
                      <span>{log.timestamp}</span>
                    </div>
                    <p className="text-white/90 leading-snug line-clamp-2">{log.text}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MAIN HOLOGRAPHIC GLASS-MORPHISM CAPTION BOX */}
      <div 
        onClick={handleBoxClick}
        style={{
          boxShadow: config.glow,
          transition: 'all 0.3s ease',
          cursor: 'pointer'
        }}
      >
        <CornerFrame 
          className={`rounded-2xl border bg-[#040b14]/90 backdrop-blur-xl ${config.border} relative overflow-hidden`}
          accent={config.color}
        >
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40 z-0" />
          <div className="absolute top-0 right-0 h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent animate-pulse pointer-events-none" />

          <div className="flex flex-col h-full justify-between relative z-10">
            
            {/* INLINE HEADER WITH BACK / HISTORY CYCLE BUTTON */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-cyan-500/30 bg-cyan-950/20">
              <div className="flex items-center gap-2">
                {/* Back / History Toggle Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const history = window.__gameCaptionHistory;
                    if (history && history.length > 0 && historyIndex < history.length - 1) {
                      const nextIndex = historyIndex + 1;
                      const prev = history[nextIndex];
                      if (prev) {
                        setText(prev.text);
                        setCurrentType(prev.type || 'info');
                        setActions(prev.actions ?? []);
                        setHistoryIndex(nextIndex);
                      }
                    }
                  }}
                  className="p-1 rounded border border-cyan-400/40 text-cyan-400 hover:bg-cyan-500/20 transition active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                  title="Cycle Back to Previous Transmission"
                  disabled={!window.__gameCaptionHistory || historyIndex >= window.__gameCaptionHistory.length - 1}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <span className="text-[11px] font-mono tracking-widest text-cyan-400 uppercase">
                  {TYPE_CONFIG[currentType as CaptionType]?.label || 'COMM_FEED'}
                </span>
              </div>

              <span className="text-[10px] font-mono text-cyan-500/70">
                {new Date().toLocaleTimeString()}
              </span>
            </div>

            <div className="p-4">
              <div>
                <div className={`text-[10px] mb-2 tracking-[0.35em] font-bold ${config.textStyle} flex justify-between items-center uppercase`}>
                  <div className="flex items-center gap-3">
                    <span>STATUS READOUT</span>
                    {!isTypingComplete && (
                      <div className="flex items-center gap-0.5 h-3">
                        <span className="w-0.5 h-full animate-[bounce_0.6s_infinite]" style={{ backgroundColor: config.color, animationDelay: '0.1s' }} />
                        <span className="w-0.5 h-2/3 animate-[bounce_0.6s_infinite]" style={{ backgroundColor: config.color, animationDelay: '0.3s' }} />
                        <span className="w-0.5 h-full animate-[bounce_0.6s_infinite]" style={{ backgroundColor: config.color, animationDelay: '0.2s' }} />
                        <span className="w-0.5 h-1/2 animate-[bounce_0.6s_infinite]" style={{ backgroundColor: config.color, animationDelay: '0.4s' }} />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[9px] opacity-50 font-mono hidden sm:inline">SYNC:{flickerValue}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDrawerOpen(!isDrawerOpen);
                      }}
                      className="text-[9px] opacity-80 hover:opacity-100 text-white font-normal bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded transition uppercase tracking-widest pointer-events-auto border border-white/10"
                    >
                      {isDrawerOpen ? 'Close Menu' : 'Missions & Logs'}
                    </button>
                    <span className="text-[9px] opacity-70 text-white font-normal">
                      {isTypingComplete ? '[Dismiss]' : '[Skip]'}
                    </span>
                  </div>
                </div>

                <div className="text-white text-sm leading-relaxed min-h-14 pr-2 font-mono" style={{ wordBreak: 'break-word' }}>
                  {(() => {
                    const text = displayedText || 'Mission control online.';
                    const match = text.match(/^\[(.*?)\]:?\s*(.*)$/); // Match [Name]: or just [Name]
                    if (match) {
                      const character = match[1];
                      const speech = match[2];
                      let charColor = 'text-cyan-400';
                      if (character.includes('Modi')) charColor = 'text-emerald-400';
                      else if (character.includes('Broadcast') || character.includes('Alert') || character.includes('Failure') || character.includes('Critical')) charColor = 'text-red-400';
                      else if (character.includes('Log') || character.includes('Complete') || character.includes('Sequence') || character.includes('Telemetry')) charColor = 'text-purple-400';
                      else charColor = 'text-amber-400'; // Default for the Player
                      
                      return (
                        <div className="flex items-start gap-3">
                          {charColor === 'text-amber-400' && (
                            <img src={astronautAvatar} alt="Commander Avatar" className="w-8 h-8 rounded border border-amber-400/30 object-cover mt-0.5 shrink-0" />
                          )}
                          <div className="flex-1">
                            <span className={`${charColor} font-bold mr-2`}>[{character}]{speech ? ':' : ''}</span>
                            <span className="text-white/90">{speech}</span>
                          </div>
                        </div>
                      );
                    }
                    return <span>{text}</span>;
                  })()}
                  {!isTypingComplete && (
                    <span 
                      className="inline-block w-2.5 h-4 ml-1 align-middle" 
                      style={{ backgroundColor: config.color, animation: 'pulse 0.8s infinite' }} 
                    />
                  )}
                </div>
              </div>

              {actions.length > 0 && (
                <div className="mt-4 grid gap-2 sm:grid-cols-3 pointer-events-auto">
                  {actions.map((action, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={(evt) => {
                        evt.stopPropagation();
                        action.handler();
                      }}
                      className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/20 active:scale-95"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}

              {isTypingComplete && (
                <div className="flex justify-between items-center mt-3 border-t border-white/5 pt-2">
                  <span className="text-[9px] opacity-60 font-semibold tracking-[0.25em] flex items-center gap-1.5 text-white uppercase">
                    Data Logged <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: config.color }} />
                  </span>
                  <span className="text-[9px] opacity-60 uppercase tracking-[0.2em] text-white/70">Tap box to dismiss</span>
                </div>
              )}
            </div>

          </div>
        </CornerFrame>
      </div>
    </div>
  );
}