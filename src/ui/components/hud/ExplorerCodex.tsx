import { useMemo } from 'react';
import { useStore } from '../../../state/store';
import { CornerFrame } from './CornerFrame';

export function ExplorerCodex() {
  const codexEntries = useStore((state) => state.codexEntries);
  const unlockedEntries = useMemo(
    () => codexEntries.filter((entry) => entry.unlocked),
    [codexEntries]
  );
  const lockedCount = codexEntries.length - unlockedEntries.length;

  return (
    <CornerFrame className="font-mono text-[#E6E9EF] w-[min(340px,calc(100vw-2rem))] max-h-[38vh] overflow-hidden" accent="#A78BFA">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold tracking-[0.2em] text-[#A78BFA]">EXPLORER&apos;S CODEX</h2>
          <p className="text-[10px] text-white/50 uppercase tracking-[0.24em]">World knowledge & discovery log</p>
        </div>
        <div className="text-right text-[10px] uppercase tracking-[0.24em] text-white/60">
          <div>{unlockedEntries.length} / {codexEntries.length}</div>
          <div>{lockedCount} locked</div>
        </div>
      </div>

      <div className="space-y-3 overflow-y-auto pr-2 pb-1 text-sm">
        {unlockedEntries.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-[12px] text-white/70">
            Unlock planetary codex entries by entering each body&apos;s sphere of influence.
          </div>
        ) : (
          unlockedEntries.map((entry) => (
            <div key={entry.id} className="rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:border-white/20">
              <div className="text-xs uppercase tracking-[0.24em] text-[#EDE9FE] opacity-90">{entry.title}</div>
              <p className="mt-2 text-[13px] leading-5 text-white/85">{entry.description}</p>
            </div>
          ))
        )}
      </div>
    </CornerFrame>
  );
}
