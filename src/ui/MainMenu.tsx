import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../state/store'; // Adjust path as needed

export const MainMenu: React.FC = () => {
  const hasSave = useStore((state) => state.hasSave);
  const continueGame = useStore((state) => state.continueGame);
  const startNewGame = useStore((state) => state.startNewGame);
  const [showSettings, setShowSettings] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [musicVolume, setMusicVolume] = useState(80);
  const [sfxVolume, setSfxVolume] = useState(70);

  // Play interface interaction sound
  const playSfx = () => {
    const audio = new Audio('https://mixkit.co');
    audio.volume = sfxVolume / 100;
    audio.play().catch(() => {});
  };

  const handleContinue = () => continueGame();
  const handleNewGame = () => startNewGame();
  const handleQuit = () => {
    // Wire this up to your platform's quit/exit behavior (Electron app.quit(), window.close(), etc.)
    window.close();
    setShowQuitConfirm(false);
  };

  const menuItems = [
    { label: 'Continue', action: handleContinue, primary: true, disabled: !hasSave },
    { label: 'New Game', action: handleNewGame, primary: !hasSave },
    { label: 'Settings', action: () => setShowSettings(true), primary: false },
    { label: 'Quit', action: () => setShowQuitConfirm(true), primary: false },
  ];

  return (
    <div className="relative w-screen h-screen flex flex-col justify-center px-12 md:px-24 bg-black text-white select-none overflow-hidden font-mono">

      {/* Deep space backdrop */}
      <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950/20 via-black to-slate-900/40 z-0 pointer-events-none" />

      {/* Starfield */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-60">
        {Array.from({ length: 60 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-cyan-100"
            style={{
              width: Math.random() > 0.85 ? 2 : 1,
              height: Math.random() > 0.85 ? 2 : 1,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.6 + 0.2,
            }}
          />
        ))}
      </div>

      {/* Scanline overlay for a digital/CRT feel */}
      <div
        className="absolute inset-0 z-20 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, #22d3ee 0px, #22d3ee 1px, transparent 1px, transparent 3px)',
        }}
      />

      {/* Corner HUD brackets */}
      <div className="absolute top-6 left-6 w-10 h-10 border-t-2 border-l-2 border-cyan-500/40 z-10" />
      <div className="absolute top-6 right-6 w-10 h-10 border-t-2 border-r-2 border-cyan-500/40 z-10" />
      <div className="absolute bottom-6 left-6 w-10 h-10 border-b-2 border-l-2 border-cyan-500/40 z-10" />
      <div className="absolute bottom-6 right-6 w-10 h-10 border-b-2 border-r-2 border-cyan-500/40 z-10" />

      {/* Status readout, top-right style HUD text */}
      <div className="absolute top-8 right-16 z-10 text-right text-[10px] tracking-widest text-cyan-500/50 uppercase leading-relaxed hidden md:block">
        <p>Comms Link :: Stable</p>
        <p>Nav System :: Online</p>
        <p>Life Support :: 100%</p>
      </div>

      {/* Main UI Container */}
      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div className="flex items-center gap-3 mb-1">
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_2px_rgba(34,211,238,0.6)]" />
            <span className="text-[11px] uppercase tracking-[0.3em] text-cyan-400/80">
              Mission Control // Terminal Active
            </span>
          </div>
          <h1 className="text-6xl md:text-7xl font-black tracking-widest bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent uppercase drop-shadow-[0_5px_15px_rgba(34,211,238,0.25)]">
            Orbit Simulator
          </h1>
          <p className="mt-3 text-sm md:text-base text-slate-400 max-w-md tracking-wide leading-relaxed">
            Navigate celestial bodies, master transfer windows, and conquer the solar system.
          </p>
        </motion.div>

        {/* Dynamic Nav Menu */}
        <nav className="mt-10 flex flex-col gap-3 max-w-sm">
          {menuItems.map((item, index) => (
            <motion.button
              key={item.label}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: item.disabled ? 0.4 : 1 }}
              transition={{
                delay: index * 0.12,
                type: 'spring',
                stiffness: 110,
                damping: 14,
              }}
              whileHover={item.disabled ? {} : { scale: 1.03, x: 8 }}
              whileTap={item.disabled ? {} : { scale: 0.98 }}
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return;
                playSfx();
                item.action();
              }}
              className={`group relative text-left py-3.5 px-6 text-xl font-bold uppercase tracking-wider border rounded-md transition-all duration-200 ${
                item.disabled
                  ? 'bg-slate-900/40 text-slate-600 border-slate-800/60 cursor-not-allowed'
                  : item.primary
                  ? 'bg-cyan-500/10 text-cyan-100 border-cyan-400/60 shadow-[0_0_20px_-4px_rgba(34,211,238,0.5)] hover:bg-cyan-400/20 hover:border-cyan-300 hover:shadow-[0_0_28px_-2px_rgba(34,211,238,0.7)]'
                  : 'bg-slate-900/50 text-slate-300 border-slate-800 hover:bg-slate-800/70 hover:text-cyan-200 hover:border-cyan-700/60'
              }`}
            >
              <span className="flex items-center justify-between">
                <span className="flex items-center gap-3">
                  <span className="text-cyan-500/60 text-xs font-mono">
                    0{index + 1}
                  </span>
                  {item.label}
                </span>
                <span
                  className={`text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity ${
                    item.disabled ? 'hidden' : ''
                  }`}
                >
                  &gt;
                </span>
              </span>
            </motion.button>
          ))}
        </nav>

        <p className="mt-8 text-[10px] tracking-widest text-slate-600 uppercase">
          Build v0.1.0 :: Terminal ID #OS-2291
        </p>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-950/95 border border-cyan-900/60 p-8 rounded-xl w-full max-w-md shadow-2xl shadow-cyan-500/10 backdrop-blur-md font-mono"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                <span className="text-[10px] uppercase tracking-[0.3em] text-cyan-500/70">
                  Console Access
                </span>
              </div>
              <h2 className="text-2xl font-black uppercase tracking-wider mb-6 bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                System Calibration
              </h2>

              {/* Audio Controls */}
              <div className="space-y-5 mb-8">
                <div>
                  <div className="flex justify-between text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2">
                    <span>Music Volume</span>
                    <span className="text-cyan-400">{musicVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={musicVolume}
                    onChange={(e) => setMusicVolume(Number(e.target.value))}
                    className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg cursor-pointer appearance-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2">
                    <span>SFX Volume</span>
                    <span className="text-cyan-400">{sfxVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sfxVolume}
                    onChange={(e) => setSfxVolume(Number(e.target.value))}
                    className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg cursor-pointer appearance-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  playSfx();
                  setShowSettings(false);
                }}
                className="w-full py-3 bg-cyan-500/90 hover:bg-cyan-400 text-black font-bold uppercase tracking-wider rounded-lg transition shadow-lg shadow-cyan-500/20"
              >
                Confirm &amp; Return
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quit Confirmation Modal */}
      <AnimatePresence>
        {showQuitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-950/95 border border-red-900/50 p-8 rounded-xl w-full max-w-sm shadow-2xl shadow-red-500/10 backdrop-blur-md font-mono text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                <span className="text-[10px] uppercase tracking-[0.3em] text-red-400/70">
                  Warning
                </span>
              </div>
              <h2 className="text-xl font-black uppercase tracking-wider mb-6 text-red-300">
                Terminate Session?
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    playSfx();
                    setShowQuitConfirm(false);
                  }}
                  className="flex-1 py-3 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold uppercase tracking-wider rounded-lg transition text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    playSfx();
                    handleQuit();
                  }}
                  className="flex-1 py-3 bg-red-600/90 hover:bg-red-500 text-white font-bold uppercase tracking-wider rounded-lg transition text-sm shadow-lg shadow-red-600/20"
                >
                  Quit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};