import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../state/store';

export const MainMenu: React.FC = () => {
  const hasSave = useStore((state) => state.hasSave);
  const continueGame = useStore((state) => state.continueGame);
  const startNewGame = useStore((state) => state.startNewGame);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [musicVolume, setMusicVolume] = useState(80);
  const [sfxVolume, setSfxVolume] = useState(70);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Handle background music playback & browser autoplay restrictions
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.volume = musicVolume / 100;
    audio.loop = true;

    // Attempt to play on mount. If it fails, user interaction will start it via playSfx.
    audio.play().catch(() => {
      console.log("Autoplay blocked: Music will start on first user interaction.");
    });
  }, []);

  // Update MP3 volume dynamically when slider changes in Settings
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = musicVolume / 100;
    }
  }, [musicVolume]);

  const playSfx = (type: 'hover' | 'click' = 'click') => {
    // This function is a great place to ensure our main audio is playing.
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
    }

    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      if (type === 'hover') {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.04);
        gain.gain.setValueAtTime((sfxVolume / 100) * 0.03, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(329.63, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime((sfxVolume / 100) * 0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      }
      
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
    } catch {
      // Audio fallback
    }
  };

  const handleContinue = () => continueGame();
  const handleNewGame = () => startNewGame();
  const handleQuit = () => {
    try {
      window.close();
    } catch {
      // Browser safety fallback
    }
    setShowQuitConfirm(false);
  };

  const menuItems = [
    { label: 'Continue', action: handleContinue, primary: true, disabled: !hasSave },
    { label: 'New Game', action: handleNewGame, primary: !hasSave },
    { label: 'Settings', action: () => setShowSettings(true), primary: false },
    { label: 'Quit', action: () => setShowQuitConfirm(true), primary: false },
  ];

  return (
    <div className="relative w-screen h-screen flex flex-col justify-center px-12 md:px-24 text-white select-none overflow-hidden font-mono bg-black">

      {/* Background Audio Element: Ensure your MP3 file is placed in public/ (e.g., sound.mp3 or soundtrack.mp3) */}
      <audio ref={audioRef} src="/Far-North.mp3" preload="auto" />

      {/* Video Background Layer: earth.mp4 from public folder */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="absolute w-full h-full object-cover filter brightness-75 contrast-110"
          src="/earth.mp4"
        />
      </div>

      {/* Cinematic Dark Vignette & Overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/30 z-0 pointer-events-none" />
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-black/40 to-black/90 z-0 pointer-events-none" />

      {/* CRT Scanline Overlay */}
      <div
        className="absolute inset-0 z-20 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, #22d3ee 0px, #22d3ee 1px, transparent 1px, transparent 3px)',
        }}
      />

      {/* Cybernetic Corner HUD Brackets */}
      <div className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 border-cyan-400/60 z-10 shadow-[0_0_12px_rgba(34,211,238,0.3)]" />
      <div className="absolute top-8 right-8 w-12 h-12 border-t-2 border-r-2 border-cyan-400/60 z-10 shadow-[0_0_12px_rgba(34,211,238,0.3)]" />
      <div className="absolute bottom-8 left-8 w-12 h-12 border-b-2 border-l-2 border-cyan-400/60 z-10 shadow-[0_0_12px_rgba(34,211,238,0.3)]" />
      <div className="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 border-cyan-400/60 z-10 shadow-[0_0_12px_rgba(34,211,238,0.3)]" />

      {/* Top-Right Mission Status HUD Panel */}
      <div className="absolute top-10 right-20 z-10 text-right text-[11px] tracking-[0.2em] text-cyan-400/70 uppercase leading-relaxed hidden md:block bg-black/40 backdrop-blur-md px-4 py-2.5 rounded border border-cyan-900/40 shadow-lg shadow-cyan-950/50">
        <p className="flex items-center justify-end gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          COMMS LINK :: SECURE
        </p>
        <p>NAV MATRIX :: SYNCHRONIZED</p>
        <p className="text-cyan-300">AUDIO FEED :: ACTIVE</p>
      </div>

      {/* Main UI Container */}
      <div className="relative z-10 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: -25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping absolute" />
            <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full shadow-[0_0_12px_3px_rgba(34,211,238,0.8)]" />
            <span className="text-xs uppercase tracking-[0.35em] text-cyan-300/90 font-semibold">
              MISSION CONTROL // ORBITAL INTERFACE v1.4
            </span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-widest bg-gradient-to-r from-cyan-200 via-cyan-400 to-indigo-400 bg-clip-text text-transparent uppercase drop-shadow-[0_0_30px_rgba(34,211,238,0.4)]">
            ORBIT SIMULATOR
          </h1>
          
          <p className="mt-4 text-sm md:text-base text-slate-300 max-w-lg tracking-wide leading-relaxed font-sans">
            Calculate transfer vectors, navigate deep-space planetary gravitational fields, and conquer the solar system.
          </p>
        </motion.div>

        {/* Dynamic Nav Menu */}
        <nav className="mt-10 flex flex-col gap-3.5 max-w-md">
          {menuItems.map((item, index) => (
            <motion.button
              key={item.label}
              initial={{ x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: item.disabled ? 0.35 : 1 }}
              transition={{
                delay: index * 0.1,
                type: 'spring',
                stiffness: 120,
                damping: 15,
              }}
              whileHover={item.disabled ? {} : { scale: 1.025, x: 10 }}
              whileTap={item.disabled ? {} : { scale: 0.98 }}
              onHoverStart={() => !item.disabled && playSfx('hover')}
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return;
                playSfx('click');
                item.action();
              }}
              className={`group relative text-left py-4 px-7 text-lg font-bold uppercase tracking-wider border rounded-lg transition-all duration-300 backdrop-blur-sm ${
                item.disabled
                  ? 'bg-slate-950/40 text-slate-600 border-slate-900 cursor-not-allowed shadow-none'
                  : item.primary
                  ? 'bg-cyan-500/15 text-cyan-100 border-cyan-400/70 shadow-[0_0_25px_-4px_rgba(34,211,238,0.4)] hover:bg-cyan-400/25 hover:border-cyan-200 hover:shadow-[0_0_35px_-2px_rgba(34,211,238,0.7)]'
                  : 'bg-slate-950/60 text-slate-300 border-slate-800/80 hover:bg-slate-900/80 hover:text-cyan-200 hover:border-cyan-600/70 hover:shadow-[0_0_20px_-5px_rgba(34,211,238,0.3)]'
              }`}
            >
              <span className="flex items-center justify-between">
                <span className="flex items-center gap-4">
                  <span className="text-cyan-400/70 text-xs font-mono tracking-widest">
                    // 0{index + 1}
                  </span>
                  {item.label}
                </span>
                <span
                  className={`text-cyan-400 font-bold opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2 group-hover:translate-x-0 ${
                    item.disabled ? 'hidden' : ''
                  }`}
                >
                  &gt;
                </span>
              </span>
            </motion.button>
          ))}
        </nav>
      </div>

      {/* Settings Modal Overlay */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
          >
            <div className="bg-slate-950 border border-cyan-500/50 p-8 rounded-lg max-w-md w-full shadow-[0_0_40px_rgba(34,211,238,0.2)]">
              <h2 className="text-xl font-bold text-cyan-300 mb-6 uppercase tracking-wider">// SYSTEM CALIBRATION</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="text-xs uppercase text-slate-400 block mb-2">Music Volume: {musicVolume}%</label>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={musicVolume} 
                    onChange={(e) => setMusicVolume(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase text-slate-400 block mb-2">SFX Volume: {sfxVolume}%</label>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={sfxVolume} 
                    onChange={(e) => setSfxVolume(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>

              <button 
                onClick={() => { playSfx('click'); setShowSettings(false); }}
                className="mt-8 w-full py-3 bg-cyan-500/20 text-cyan-200 border border-cyan-400/60 rounded font-bold uppercase tracking-wider hover:bg-cyan-400/30 transition-all"
              >
                Save & Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quit Confirmation Overlay */}
      <AnimatePresence>
        {showQuitConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
          >
            <div className="bg-slate-950 border border-red-500/50 p-8 rounded-lg max-w-sm w-full shadow-[0_0_40px_rgba(239,68,68,0.2)] text-center">
              <h2 className="text-xl font-bold text-red-400 mb-4 uppercase tracking-wider">// TERMINATE LINK?</h2>
              <p className="text-xs text-slate-400 mb-6">Are you sure you want to disconnect from mission control?</p>
              
              <div className="flex gap-4">
                <button 
                  onClick={handleQuit}
                  className="flex-1 py-3 bg-red-500/20 text-red-200 border border-red-400/60 rounded font-bold uppercase tracking-wider hover:bg-red-400/30 transition-all"
                >
                  Yes
                </button>
                <button 
                  onClick={() => setShowQuitConfirm(false)}
                  className="flex-1 py-3 bg-slate-800 text-slate-200 border border-slate-700 rounded font-bold uppercase tracking-wider hover:bg-slate-700 transition-all"
                >
                  No
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};