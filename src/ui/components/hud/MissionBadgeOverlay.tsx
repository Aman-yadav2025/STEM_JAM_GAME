import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore, type Mission } from '../../../state/store';

export const MissionBadgeOverlay: React.FC = () => {
  const missions = useStore((state) => state.missions);
  const [completedQueue, setCompletedQueue] = useState<Mission[]>([]);
  const [activeBadge, setActiveBadge] = useState<Mission | null>(null);
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());

  // Track newly completed missions
  useEffect(() => {
    const newlyCompleted = missions.filter(
      (m) => m.status === 'completed' && !processedIds.has(m.id)
    );

    if (newlyCompleted.length > 0) {
      setCompletedQueue((q) => [...q, ...newlyCompleted]);
      setProcessedIds((prev) => {
        const next = new Set(prev);
        newlyCompleted.forEach((m) => next.add(m.id));
        return next;
      });
    }
  }, [missions, processedIds]);

  // Process the queue one by one
  useEffect(() => {
    if (!activeBadge && completedQueue.length > 0) {
      const nextBadge = completedQueue[0];
      setActiveBadge(nextBadge);
      setCompletedQueue((q) => q.slice(1));
    }
  }, [activeBadge, completedQueue]);

  // Dismiss active badge after 2 seconds
  useEffect(() => {
    if (activeBadge) {
      const timer = setTimeout(() => {
        setActiveBadge(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [activeBadge]);

  return (
    <div className="absolute inset-x-0 top-16 pointer-events-none flex justify-center z-50">
      <AnimatePresence>
        {activeBadge && (
          <motion.div
            key={activeBadge.id}
            initial={{ y: -50, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="bg-black/80 backdrop-blur-md border border-cyan-500/50 p-4 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.3)] flex flex-col items-center max-w-md w-full mx-4"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-cyan-400 font-bold tracking-[0.2em] uppercase text-xs">
                Objective Complete
              </h2>
            </div>
            <div className="text-white font-semibold text-center text-sm mb-1 uppercase tracking-widest">
              {activeBadge.title}
            </div>
            <div className="text-white/70 text-xs text-center leading-relaxed">
              {activeBadge.description}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
