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
  text: string;
  type: CaptionType;
  actions?: CaptionAction[];
};

declare global {
  interface Window {
    __gameCaptionLast?: CaptionPayload;
  }
}

const TYPE_CONFIG = {
  info: { label: 'MISSION CONTROL / DATA', color: '#4FB4E8', textStyle: 'text-[#4FB4E8]' },
  warning: { label: 'CRITICAL ALERT / DYNAMICS', color: '#EF4444', textStyle: 'text-red-500' },
  success: { label: 'MISSION OBJECTIVE MET', color: '#10B981', textStyle: 'text-emerald-500' },
  tip: { label: 'FLIGHT COMPUTER / TIP', color: '#F59E0B', textStyle: 'text-amber-500' },
};

/**
 * Global helper function to trigger an educational caption from anywhere in the codebase!
 */
export function showGameCaption(text: string, type: CaptionType = 'info', actions: CaptionAction[] = []) {
  const payload = { text, type, actions };
  window.__gameCaptionLast = payload;
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
  const [currentType, setCurrentType] = useState(() => {
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
  const typingTimerRef = useRef<number | null>(null);

  const config = TYPE_CONFIG[currentType] || TYPE_CONFIG.info;

  // 1. Listen for global caption events from anywhere in the game
  useEffect(() => {
    const handleGlobalCaption = (e: Event) => {
      const customEvent = e as CustomEvent<{ text: string; type?: CaptionType; actions?: CaptionAction[] }>;
      if (customEvent.detail) {
        setText(customEvent.detail.text);
        setCurrentType(customEvent.detail.type || 'info');
        setActions(customEvent.detail.actions ?? []);
        setVisible(true);
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

  // 2. Display the caption clearly and immediately so it reads as a polished game message.
  useEffect(() => {
    if (!visible || !text) {
      setDisplayedText('');
      setIsTypingComplete(false);
      if (typingTimerRef.current) {
        window.clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      return;
    }

    setDisplayedText('');
    setIsTypingComplete(false);
    if (typingTimerRef.current) {
      window.clearInterval(typingTimerRef.current);
    }

    let cursor = 0;
    typingTimerRef.current = window.setInterval(() => {
      cursor += 1;
      setDisplayedText(text.slice(0, cursor));
      if (cursor >= text.length) {
        setIsTypingComplete(true);
        if (typingTimerRef.current) {
          window.clearInterval(typingTimerRef.current);
          typingTimerRef.current = null;
        }
      }
    }, 24);

    return () => {
      if (typingTimerRef.current) {
        window.clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    };
  }, [text, visible]);

  // Click handler to skip typewriter or dismiss completed caption
  const handleBoxClick = () => {
    if (!isTypingComplete) {
      setDisplayedText(text);
      setIsTypingComplete(true);
      if (typingTimerRef.current) {
        window.clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      return;
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[min(92vw,760px)] z-100 pointer-events-auto">
      <CornerFrame 
        className="font-mono cursor-pointer transition-all duration-300 select-none rounded-2xl border border-cyan-400/30 bg-[#07121d]/95 shadow-[0_0_35px_rgba(79,180,232,0.28)] hover:shadow-[0_0_45px_rgba(79,180,232,0.4)]"
        accent={config.color} 
      >
        <div onClick={handleBoxClick} className="flex flex-col h-full justify-between">
          <div>
            <div className={`text-[10px] mb-2 tracking-[0.35em] font-bold ${config.textStyle} flex justify-between items-center uppercase`}>
              <span>{config.label}</span>
              <span className="text-[9px] opacity-80 text-white font-normal">
                {isTypingComplete ? '[Tap to Dismiss]' : '[Tap to Skip]'}
              </span>
            </div>

            <div className="text-white text-sm leading-relaxed min-h-14 wrap-break-word pr-2">
              {displayedText || 'Mission control online.'}
              {!isTypingComplete && (
                <span 
                  className="inline-block w-2.5 h-4 ml-1 animate-[pulse_0.8s_infinite]" 
                  style={{ backgroundColor: config.color }} 
                />
              )}
            </div>
          </div>

          {actions.length > 0 && (
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {actions.map((action, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(evt) => {
                    evt.stopPropagation();
                    action.handler();
                  }}
                  className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/20"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {isTypingComplete && (
            <div className="flex justify-between items-center mt-2">
              <span className="text-[9px] opacity-60 font-semibold tracking-[0.25em] flex items-center gap-1.5 text-white uppercase">
                Data Logged <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
              </span>
              <span className="text-[9px] opacity-60 uppercase tracking-[0.2em] text-white/70">Tap to dismiss</span>
            </div>
          )}
        </div>
      </CornerFrame>
    </div>
  );
}