import { useState, useEffect, useRef } from 'react';
import { CornerFrame } from './CornerFrame';

export type CaptionType = 'info' | 'warning' | 'success' | 'tip';

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

interface MissionObjective {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  progressText?: string;
  evaluator?: () => boolean;
}

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

const TYPE_CONFIG = {
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

  // Rolling telemetry number generator state for holographic HUD immersion
  const [rollingHex, setRollingHex] = useState('0xF4A2');
  const [flickerValue, setFlickerValue] = useState('99.8%');

  // Structured Mission States linked to Physics Telemetry
  const [primaryMissions, setPrimaryMissions] = useState<MissionObjective[]>([
    {
      id: 'circ_orbit',
      title: 'Stable Circular Orbit',
      description: 'Achieve stable circular orbit parameters: eccentricity $\\epsilon < 0.05$ and periapsis altitude $> 400\\text{ km}$.',
      completed: false,
      progressText: 'Evaluating orbital parameters...',
    },
    {
      id: 'apo_raise',
      title: 'Apoapsis Elevation',
      description: 'Perform a prograde burn to extend your apoapsis distance past $3200\\text{ km}$.',
      completed: false,
      progressText: 'Waiting for altitude target...',
    }
  ]);

  const [explorationContracts, setExplorationContracts] = useState<MissionObjective[]>([
    {
      id: 'luna_flyby',
      title: 'Luna Minor Proximity',
      description: 'Execute a close gravitational pass within the sphere of influence of Luna Minor.',
      completed: false,
      progressText: 'Contract pending acquisition.',
    },
    {
      id: 'high_speed',
      title: 'Orbital Velocity Milestone',
      description: 'Exceed orbital velocity thresholds above $8000\\text{ m/s}$.',
      completed: false,
      progressText: 'Monitoring telemetry speed...',
    }
  ]);

  const [classifiedGoals, setClassifiedGoals] = useState<MissionObjective[]>([
    {
      id: 'zero_vel',
      title: 'Anomaly: Zero-Velocity Hover',
      description: 'Temporarily cancel all relative momentum inside deep space without collapsing into a body.',
      completed: false,
      progressText: 'Encrypted objective locked.',
    },
    {
      id: 'atmos_graze',
      title: 'Atmospheric Friction Test',
      description: 'Graze the upper fringe threshold of a celestial body solid radius safely.',
      completed: false,
      progressText: 'Encrypted objective locked.',
    }
  ]);

  const typingTimeoutRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lunaWarningTriggeredRef = useRef<boolean>(false);

  const config = TYPE_CONFIG[currentType] || TYPE_CONFIG.info;

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

      // Environmental Comms Chatter: Sphere of Influence entry warning (e.g., Luna Minor)
      if (tel.distanceToLunaMinor !== undefined && tel.distanceToLunaMinor < 1500 && !lunaWarningTriggeredRef.current) {
        lunaWarningTriggeredRef.current = true;
        showGameCaption(
          '[STATIC TRANSMISSION] — Warning: Entering Luna Minor gravity well. Unidentified gravitational fluctuations detected. Pre-collapse telemetry suggests abandoned relay stations nearby.',
          'warning'
        );
      }

      // Evaluate Primary: Circular Orbit ($\epsilon < 0.05$ and periapsis $> 400\text{ km}$)
      setPrimaryMissions(prev => prev.map(m => {
        if (m.id === 'circ_orbit' && !m.completed) {
          const isCirc = (tel.eccentricity ?? 1) < 0.05 && (tel.periapsisAltitude ?? 0) > 400;
          if (isCirc) {
            showGameCaption('Primary Objective Met: Stable circular orbit achieved!', 'success');
            return { ...m, completed: true, progressText: 'Status: Completed' };
          }
          return { ...m, progressText: `Ecc: ${(tel.eccentricity ?? 0).toFixed(3)}, Pe: ${Math.round(tel.periapsisAltitude ?? 0)}km` };
        }
        if (m.id === 'apo_raise' && !m.completed) {
          const highApo = (tel.apoapsis ?? 0) >= 3200;
          if (highApo) {
            showGameCaption('Primary Objective Met: Target apoapsis elevation reached!', 'success');
            return { ...m, completed: true, progressText: 'Status: Completed' };
          }
          return { ...m, progressText: `Apoapsis: ${Math.round(tel.apoapsis ?? 0)}km / 3200km` };
        }
        return m;
      }));

      // Evaluate Exploration Contracts
      setExplorationContracts(prev => prev.map(m => {
        if (m.id === 'high_speed' && !m.completed) {
          const fast = (tel.velocity ?? 0) >= 8000;
          if (fast) {
            return { ...m, completed: true, progressText: 'Contract Fulfilled' };
          }
          return { ...m, progressText: `Vel: ${Math.round(tel.velocity ?? 0)}m/s` };
        }
        return m;
      }));

    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Global event listener
  useEffect(() => {
    const handleGlobalCaption = (e: Event) => {
      const customEvent = e as CustomEvent<CaptionPayload>;
      if (customEvent.detail) {
        setText(customEvent.detail.text);
        setCurrentType(customEvent.detail.type || 'info');
        setActions(customEvent.detail.actions ?? []);
        setVisible(true);
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

  // If dismissed, render a sleek persistent button to bring Mission Control & Comms back instantly!
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
            }
            setVisible(true);
            setIsDrawerOpen(true); // Automatically open missions/logs drawer for immediate access
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-cyan-400/40 bg-[#07121d]/90 text-cyan-400 text-xs font-bold uppercase tracking-[0.2em] shadow-[0_0_25px_rgba(79,180,232,0.35)] backdrop-blur-xl hover:bg-cyan-500/20 transition active:scale-95"
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          [ Open Mission Control / Comms ]
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[min(94vw,780px)] z-100 pointer-events-auto font-mono select-none">
      
      {/* STRUCTURED MISSION CONTROL & COMMS DRAWER */}
      {isDrawerOpen && (
        <div className="mb-3 rounded-2xl border border-white/20 bg-[#07121d]/90 p-4 shadow-[0_0_35px_rgba(0,0,0,0.85)] backdrop-blur-xl max-h-80 overflow-y-auto animate-in fade-in duration-200 relative overflow-hidden">
          {/* Subtle grid scanning lines overlay */}
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

          {/* TAB HEADERS */}
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

          {/* TAB CONTENT: PRIMARY DIRECTIVES */}
          {activeTab === 'primary' && (
            <div className="space-y-2.5 relative z-10">
              {primaryMissions.map((m) => (
                <div key={m.id} className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-white flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${m.completed ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                      {m.title}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded ${m.completed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {m.completed ? 'COMPLETED' : 'ACTIVE'}
                    </span>
                  </div>
                  <p className="text-white/80 leading-snug mb-1">{m.description}</p>
                  <div className="text-[10px] text-cyan-400/80 font-mono">Telemetry: {m.progressText}</div>
                </div>
              ))}
            </div>
          )}

          {/* TAB CONTENT: EXPLORATION CONTRACTS */}
          {activeTab === 'exploration' && (
            <div className="space-y-2.5 relative z-10">
              {explorationContracts.map((m) => (
                <div key={m.id} className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-white flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${m.completed ? 'bg-emerald-400' : 'bg-cyan-400'}`} />
                      {m.title}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded ${m.completed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                      {m.completed ? 'FULFILLED' : 'OPTIONAL'}
                    </span>
                  </div>
                  <p className="text-white/80 leading-snug mb-1">{m.description}</p>
                  <div className="text-[10px] text-cyan-400/80 font-mono">Status: {m.progressText}</div>
                </div>
              ))}
            </div>
          )}

          {/* TAB CONTENT: CLASSIFIED GOALS */}
          {activeTab === 'classified' && (
            <div className="space-y-2.5 relative z-10">
              {classifiedGoals.map((m) => (
                <div key={m.id} className="p-2.5 rounded-xl border border-purple-500/20 bg-purple-950/20 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-purple-300 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                      {m.title}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                      CLASSIFIED
                    </span>
                  </div>
                  <p className="text-white/80 leading-snug mb-1">{m.description}</p>
                  <div className="text-[10px] text-purple-400/80 font-mono">{m.progressText}</div>
                </div>
              ))}
            </div>
          )}

          {/* TAB CONTENT: COMMS ARCHIVE */}
          {activeTab === 'comms' && (
            <div className="space-y-2.5 relative z-10">
              {historyLogs.map((log) => {
                const logConf = TYPE_CONFIG[log.type] || TYPE_CONFIG.info;
                return (
                  <div 
                    key={log.id} 
                    onClick={() => {
                      setText(log.text);
                      setCurrentType(log.type);
                      setActions(log.actions ?? []);
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
          {/* Grid-scanning line overlay & flickering telemetry feed background */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40 z-0" />
          <div className="absolute top-0 right-0 h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent animate-pulse pointer-events-none" />

          <div className="flex flex-col h-full justify-between relative z-10 p-1">
            <div>
              {/* HEADER WITH HOLOGRAPHIC WAVEFORM & MISSION PANEL TOGGLE */}
              <div className={`text-[10px] mb-2 tracking-[0.35em] font-bold ${config.textStyle} flex justify-between items-center uppercase`}>
                <div className="flex items-center gap-3">
                  <span>{config.label}</span>
                  {/* Holographic Waveform Visualizer */}
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

              {/* MESSAGE CONTENT */}
              <div className="text-white text-sm leading-relaxed min-h-14 pr-2 font-mono" style={{ wordBreak: 'break-word' }}>
                {displayedText || 'Mission control online.'}
                {!isTypingComplete && (
                  <span 
                    className="inline-block w-2.5 h-4 ml-1 align-middle" 
                    style={{ backgroundColor: config.color, animation: 'pulse 0.8s infinite' }} 
                  />
                )}
              </div>
            </div>

            {/* INTERACTIVE ACTION CHIPS */}
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

            {/* FOOTER STATUS */}
            {isTypingComplete && (
              <div className="flex justify-between items-center mt-2 border-t border-white/5 pt-1.5">
                <span className="text-[9px] opacity-60 font-semibold tracking-[0.25em] flex items-center gap-1.5 text-white uppercase">
                  Data Logged <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: config.color }} />
                </span>
                <span className="text-[9px] opacity-60 uppercase tracking-[0.2em] text-white/70">Tap box to dismiss</span>
              </div>
            )}
          </div>
        </CornerFrame>
      </div>
    </div>
  );
}