import { useEffect, useRef } from 'react';
import { useStore } from '../../../state/store';
import { showGameCaption } from '../../hud/CaptionBox';

export function CodexUnlocker() {
  const ship = useStore((state) => state.ship);
  const bodies = useStore((state) => state.bodies);
  const unlockCodexEntry = useStore((state) => state.unlockCodexEntry);
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

    if (!currentBodyId || currentBodyId === previousBodyId.current) {
      return;
    }

    previousBodyId.current = currentBodyId;
    const unlocked = unlockCodexEntry(currentBodyId);

    if (unlocked) {
      showGameCaption(
        `Codex unlocked: ${currentBodyId}. Check the Explorer's Codex for planetary briefing and mission context.`,
        'success',
        [
          {
            label: 'Open Codex',
            handler: () => showGameCaption(
              `New codex entry: ${currentBodyId}. Explore the archived mission notes in the Explorer's Codex to prepare for your next burn.`,
              'info'
            ),
          },
        ]
      );
    }
  }, [ship, bodies, unlockCodexEntry]);

  return null;
}
