import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore, type Mission } from '../../../state/store';

export const HyperspaceOverlay: React.FC = () => {
  const [isJumping, setIsJumping] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'stretch' | 'tunnel' | 'flash' | 'fade'>('idle');
  const fastTravelToTarget = useStore((state) => state.fastTravelToTarget);
  const [targetBody, setTargetBody] = useState<string | null>(null);

  useEffect(() => {
    const handleJump = (e: Event) => {
      const customEvent = e as CustomEvent<{ target: string }>;
      if (isJumping) return;
      
      setTargetBody(customEvent.detail.target);
      setIsJumping(true);
      setPhase('stretch');
      
      // Play a thrumming / spooling up sound if desired (using Web Audio API or just conceptual)
      
      // Timeline
      // 0.0s - 1.2s: Stretch stars
      setTimeout(() => {
        setPhase('tunnel');
      }, 1200);
      
      // 1.2s - 2.5s: Swirling tunnel
      setTimeout(() => {
        setPhase('flash');
        // ACTUALLY TELEPORT THE SHIP DURING THE BLINDING FLASH
        fastTravelToTarget(customEvent.detail.target);
      }, 2500);
      
      // 2.5s - 2.6s: Flash holds
      setTimeout(() => {
        setPhase('fade');
      }, 2600);
      
      // 2.6s - 3.5s: Fade out completely
      setTimeout(() => {
        setPhase('idle');
        setIsJumping(false);
      }, 3500);
    };

    window.addEventListener('trigger-hyperspace', handleJump);
    return () => window.removeEventListener('trigger-hyperspace', handleJump);
  }, [isJumping, fastTravelToTarget]);

  if (phase === 'idle') return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden flex items-center justify-center">
      <AnimatePresence>
        
        {/* PHASE 1: STAR STRETCH */}
        {phase === 'stretch' && (
          <motion.div
            key="stretch"
            initial={{ opacity: 0, scale: 1 }}
            animate={{ opacity: 1, scale: 5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeIn' }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {/* Generating radial star lines using conic gradient & radial masks */}
            <div 
              className="absolute inset-0"
              style={{
                background: 'repeating-conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.8) 1deg, transparent 2deg)',
                maskImage: 'radial-gradient(circle, transparent 20%, black 100%)',
                WebkitMaskImage: 'radial-gradient(circle, transparent 20%, black 100%)',
              }}
            />
          </motion.div>
        )}

        {/* PHASE 2: TUNNEL VORTEX */}
        {phase === 'tunnel' && (
          <motion.div
            key="tunnel"
            initial={{ opacity: 0, scale: 0.5, rotate: 0 }}
            animate={{ opacity: 1, scale: 2, rotate: 180 }}
            exit={{ opacity: 0, scale: 4 }}
            transition={{ duration: 1.3, ease: 'easeInOut' }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div 
              className="w-[200vw] h-[200vw] rounded-full mix-blend-screen"
              style={{
                background: 'conic-gradient(from 0deg, #00f2fe, #4facfe, #00f2fe, #ffffff, #00f2fe)',
                maskImage: 'radial-gradient(circle, transparent 10%, black 70%)',
                WebkitMaskImage: 'radial-gradient(circle, transparent 10%, black 70%)',
                filter: 'blur(8px)',
              }}
            />
          </motion.div>
        )}

        {/* PHASE 3 & 4: FLASH AND FADE */}
        {(phase === 'flash' || phase === 'fade') && (
          <motion.div
            key="flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'flash' ? 1 : 0 }}
            transition={{ duration: phase === 'flash' ? 0.1 : 0.9, ease: 'easeOut' }}
            className="absolute inset-0 bg-white"
          />
        )}
        
      </AnimatePresence>
      
      {/* UI Overlay Text */}
      {(phase === 'stretch' || phase === 'tunnel') && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="absolute bottom-32 flex flex-col items-center gap-2"
        >
          <div className="text-cyan-400 font-mono text-xs tracking-[0.5em] uppercase font-bold animate-pulse">
            Spooling Hyperdrive
          </div>
          <div className="text-white/60 font-mono text-[10px] tracking-widest uppercase">
            Target Locked: {targetBody}
          </div>
        </motion.div>
      )}
    </div>
  );
};
