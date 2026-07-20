import { useStore } from '../state/store';
import { CornerFrame } from './components/hud/CornerFrame';

export function PauseMenu() {
  const isPaused = useStore((state) => state.isPaused);
  const setPaused = useStore((state) => state.setPaused);

  if (!isPaused) return null;

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6 py-8">
      <CornerFrame className="w-full max-w-lg text-center bg-[#07121d]/95 border-white/20 px-8 py-8" accent="#FDE68A">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-[0.35em] text-[#FDE68A]">Simulation Paused</h2>
            <p className="mt-3 text-sm leading-6 text-white/80">Press Escape again or click resume to continue the simulation.</p>
          </div>

          <button
            type="button"
            onClick={() => setPaused(false)}
            className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-white transition hover:bg-white/20"
          >
            Resume
          </button>
        </div>
      </CornerFrame>
    </div>
  );
}
