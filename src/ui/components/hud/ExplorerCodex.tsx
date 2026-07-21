import { useMemo } from 'react';
import { G } from '../../../physics/constants';
import { useStore } from '../../../state/store';
import { CornerFrame } from './CornerFrame';

function calculateTelemetry(body: { name: string; mass: number; radius: number; position: { x: number; y: number; z: number } }, ship: { position: { x: number; y: number; z: number }; velocity: { magnitude: () => number } }) {
  const distance = Math.hypot(body.position.x - ship.position.x, body.position.y - ship.position.y, body.position.z - ship.position.z);
  const safeDistance = Math.max(1, distance);
  const orbitalVelocity = Math.sqrt((G * body.mass) / safeDistance);
  const escapeVelocity = Math.sqrt((2 * G * body.mass) / safeDistance);
  const atmosphericDensity = Math.max(0.01, (body.name === 'Venus' ? 0.95 : body.name === 'Earth' ? 0.42 : body.name === 'Mars' ? 0.18 : body.name === 'Mercury' ? 0.04 : body.name === 'Moon' ? 0.02 : 0.08) * (body.radius / Math.max(safeDistance, body.radius * 1.4)));
  const scanWindow = `${Math.round(body.radius * 1.4)}–${Math.round(body.radius * 3)} u`;

  return {
    distance: Math.round(distance),
    orbitalVelocity: orbitalVelocity.toFixed(2),
    escapeVelocity: escapeVelocity.toFixed(2),
    atmosphericDensity: atmosphericDensity.toFixed(3),
    scanWindow,
  };
}

export function ExplorerCodex() {
  const codexEntries = useStore((state) => state.codexEntries);
  const achievements = useStore((state) => state.achievements);
  const activeScanTargetId = useStore((state) => state.activeScanTargetId);
  const scanProgress = useStore((state) => state.scanProgress);
  const ship = useStore((state) => state.ship);
  const bodies = useStore((state) => state.bodies);
  const unlockedEntries = useMemo(
    () => codexEntries.filter((entry) => entry.unlocked),
    [codexEntries]
  );
  const lockedCount = codexEntries.length - unlockedEntries.length;
  const activeEntry = codexEntries.find((entry) => entry.id === activeScanTargetId) ?? null;
  const activeBody = bodies.find((body) => body.name === activeEntry?.id) ?? null;
  const telemetry = activeBody ? calculateTelemetry(activeBody as never, ship as never) : null;

  return (
    <CornerFrame className="font-mono text-[#E6E9EF] w-[min(340px,calc(100vw-2rem))] max-h-[38vh] overflow-hidden" accent="#A78BFA">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold tracking-[0.2em] text-[#A78BFA]">EXPLORER&apos;S CODEX</h2>
          <p className="text-[10px] text-white/50 uppercase tracking-[0.24em]">Research log & telemetry</p>
        </div>
        <div className="text-right text-[10px] uppercase tracking-[0.24em] text-white/60">
          <div>{unlockedEntries.length} / {codexEntries.length}</div>
          <div>{lockedCount} locked</div>
        </div>
      </div>

      <div className="space-y-3 overflow-y-auto pr-2 pb-1 text-sm">
        {achievements.length > 0 ? (
          <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-3">
            <div className="text-xs uppercase tracking-[0.24em] text-amber-300">ACHIEVEMENTS</div>
            <div className="mt-2 space-y-2">
              {achievements.map((achievement) => (
                <div key={achievement.id} className="rounded-xl border border-white/10 bg-black/15 p-2">
                  <div className="flex items-center justify-between gap-2 text-[12px]">
                    <span className="font-semibold text-white/90">{achievement.title}</span>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/60">
                      {achievement.unlocked ? 'Unlocked' : `${Math.round((achievement.progress / achievement.target) * 100)}%`}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-4 text-white/70">{achievement.description}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {activeEntry && activeBody && !activeEntry.unlocked ? (
          <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-3">
            <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">ACTIVE SENSOR SWEEP</div>
            <div className="mt-2 text-[13px] text-white/90">{activeEntry.title}</div>
            <div className="mt-2 h-2 rounded-full bg-white/10">
              <div className="h-2 rounded-full bg-cyan-400 transition-all" style={{ width: `${scanProgress}%` }} />
            </div>
            <p className="mt-2 text-[12px] leading-5 text-white/70">Maintain a stable orbit inside the scan corridor for a few seconds to download the planetary data.</p>
            {telemetry ? (
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-white/80">
                <div className="rounded-lg bg-black/20 p-2">
                  <div className="text-white/50">Orbital v</div>
                  <div>{telemetry.orbitalVelocity} u/s</div>
                </div>
                <div className="rounded-lg bg-black/20 p-2">
                  <div className="text-white/50">Escape v</div>
                  <div>{telemetry.escapeVelocity} u/s</div>
                </div>
                <div className="rounded-lg bg-black/20 p-2">
                  <div className="text-white/50">Atmosphere</div>
                  <div>{telemetry.atmosphericDensity}</div>
                </div>
                <div className="rounded-lg bg-black/20 p-2">
                  <div className="text-white/50">Scan window</div>
                  <div>{telemetry.scanWindow}</div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {unlockedEntries.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-[12px] text-white/70">
            Enter a planet&apos;s sphere of influence to begin a sensor sweep and build the codex log.
          </div>
        ) : (
          unlockedEntries.map((entry) => {
            const body = bodies.find((candidate) => candidate.name === entry.id) ?? null;
            const telemetryData = body ? calculateTelemetry(body as never, ship as never) : null;
            return (
              <div key={entry.id} className="rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:border-white/20">
                <div className="text-xs uppercase tracking-[0.24em] text-[#EDE9FE] opacity-90">{entry.title}</div>
                <p className="mt-2 text-[13px] leading-5 text-white/85">{entry.description}</p>
                {telemetryData ? (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-white/75">
                    <div className="rounded-lg bg-black/20 p-2">
                      <div className="text-white/50">Orbital v</div>
                      <div>{telemetryData.orbitalVelocity} u/s</div>
                    </div>
                    <div className="rounded-lg bg-black/20 p-2">
                      <div className="text-white/50">Escape v</div>
                      <div>{telemetryData.escapeVelocity} u/s</div>
                    </div>
                    <div className="rounded-lg bg-black/20 p-2">
                      <div className="text-white/50">Atmosphere</div>
                      <div>{telemetryData.atmosphericDensity}</div>
                    </div>
                    <div className="rounded-lg bg-black/20 p-2">
                      <div className="text-white/50">Scan window</div>
                      <div>{telemetryData.scanWindow}</div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </CornerFrame>
  );
}
