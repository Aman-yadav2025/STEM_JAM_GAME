import { useEffect, useRef } from 'react';
import { useStore } from '../../../state/store';
import { showGameCaption } from '../../hud/CaptionBox';

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

  return null;
}
