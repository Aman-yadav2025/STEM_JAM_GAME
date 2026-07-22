import { useEffect, useRef } from 'react';
import { useStore } from '../../../state/store';
import { showGameCaption } from './CaptionBox';

export function CodexUnlocker() {
  const ship = useStore((state) => state.ship);
  const bodies = useStore((state) => state.bodies);
  const activeScanTargetId = useStore((state) => state.activeScanTargetId);
  const scanProgress = useStore((state) => state.scanProgress);
  const startCodexScan = useStore((state) => state.startCodexScan);
  const updateCodexScanProgress = useStore((state) => state.updateCodexScanProgress);
  const completeCodexScan = useStore((state) => state.completeCodexScan);
  const resetCodexScan = useStore((state) => state.resetCodexScan);
  const codexEntries = useStore((state) => state.codexEntries);
  const previousBodyId = useRef<string | null>(null);

  useEffect(() => {
    if (!ship || bodies.length === 0) return;

    let currentBodyId: string | null = null;
    let smallestSoI = Infinity;

    bodies.forEach((body) => {
      const distance = ship.position.distanceTo(body.position);
      if (distance < body.soiRadius && body.soiRadius < smallestSoI) {
        smallestSoI = body.soiRadius;
        currentBodyId = body.name;
      }
    });

    if (!currentBodyId || currentBodyId === 'Sun') {
      return;
    }

    const entry = codexEntries.find((codex) => codex.id === currentBodyId);
    if (!entry) {
      return;
    }

    if (!entry.unlocked && !activeScanTargetId) {
      previousBodyId.current = currentBodyId;
      startCodexScan(currentBodyId);
      showGameCaption(
        `Sensor sweep activated for ${currentBodyId}. Hold a stable orbit within the scan corridor to download the data.`,
        'info'
      );
      return;
    }

    if (entry.unlocked || currentBodyId !== previousBodyId.current) {
      previousBodyId.current = currentBodyId;
    }
  }, [ship, bodies, codexEntries, activeScanTargetId, startCodexScan]);

  useEffect(() => {
    if (!activeScanTargetId) {
      return;
    }

    const interval = window.setInterval(() => {
      const state = useStore.getState();
      const targetBody = state.bodies.find((body) => body.name === activeScanTargetId);
      const entry = state.codexEntries.find((codex) => codex.id === activeScanTargetId);

      if (!targetBody || !entry || entry.unlocked) {
        resetCodexScan();
        return;
      }

      const distance = state.ship.position.distanceTo(targetBody.position);
      const inRange = distance >= targetBody.radius * 1.4 && distance <= targetBody.radius * 3.0;
      const stableVelocity = state.ship.velocity.magnitude() < targetBody.radius * 0.35 + 5;

      if (inRange && stableVelocity) {
        const nextProgress = Math.min(100, state.scanProgress + 7);
        updateCodexScanProgress(nextProgress);

        if (nextProgress >= 100) {
          const scanned = completeCodexScan(activeScanTargetId);
          if (scanned) {
            showGameCaption(
              `Research complete: ${activeScanTargetId} telemetry downloaded. Open the Explorer's Codex for the new scientific log.`,
              'success'
            );
          }
        }
      } else {
        updateCodexScanProgress(0);
      }
    }, 200);

    return () => window.clearInterval(interval);
  }, [activeScanTargetId, completeCodexScan, resetCodexScan, updateCodexScanProgress]);

  useEffect(() => {
    if (scanProgress > 0 && scanProgress < 100 && !activeScanTargetId) {
      resetCodexScan();
    }
  }, [activeScanTargetId, scanProgress, resetCodexScan]);

  // If there's no active scan and progress is 0, don't render anything on screen
  if (!activeScanTargetId && scanProgress === 0) {
    return null;
  }

  // Visual HUD Banner so you can actually see the scanning progress live!
  return (
    <div className="absolute top-20 left-1/2 transform -translate-x-1/2 pointer-events-none z-30 flex flex-col items-center">
      <div className="bg-black/90 border border-cyan-400 px-6 py-3 rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.4)] backdrop-blur-md flex flex-col items-center min-w-[320px]">
        <div className="flex justify-between w-full text-xs text-cyan-300 font-mono tracking-widest mb-1.5">
          <span className="font-bold">[UPLINK: {activeScanTargetId}]</span>
          <span className="text-cyan-400 font-bold">{scanProgress}%</span>
        </div>
        <div className="w-full bg-cyan-950/80 h-2.5 rounded-full overflow-hidden border border-cyan-500/50">
          <div 
            className="bg-cyan-400 h-full transition-all duration-200 shadow-[0_0_10px_rgba(6,182,212,0.9)]"
            style={{ width: `${scanProgress}%` }}
          />
        </div>
        <div className="text-[11px] text-cyan-200/80 mt-1.5 uppercase tracking-wider font-mono">
          {scanProgress > 0 ? 'Downloading telemetry...' : 'Awaiting stable orbit corridor'}
        </div>
      </div>
    </div>
  );
}