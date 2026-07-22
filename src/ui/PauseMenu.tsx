import { useStore } from '../state/store';
import { CornerFrame } from './components/hud/CornerFrame';
import { MusicControls } from './components/hud/MusicControls';

export function PauseMenu() {
  const isPaused = useStore((state) => state.isPaused);
  const setPaused = useStore((state) => state.setPaused);
  
  // Make sure to add this action to your Zustand store if you haven't already!
  const returnToMainMenu = useStore((state) => state.returnToMainMenu);

  if (!isPaused) return null;

  const handleReturnToMenu = () => {
    setPaused(false); // Unpause first so it doesn't stay paused in the background
    if (returnToMainMenu) returnToMainMenu();
  };

  const handleQuit = () => {
    window.close();
  };

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6 py-8">
      <CornerFrame className="w-full max-w-lg text-center bg-[#07121d]/95 border-white/20 px-8 py-8" accent="#FDE68A">
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-[0.35em] text-[#FDE68A]">Simulation Paused</h2>
            <p className="mt-3 text-sm leading-6 text-white/80">Press Escape again or click resume to continue the simulation.</p>
          </div>

          {/* Button Stack */}
          <div className="space-y-6">
            <div className="flex flex-col gap-4 max-w-xs mx-auto">
              <button
                type="button"
                onClick={() => setPaused(false)}
                className="inline-flex w-full items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-white transition hover:bg-white/20 hover:scale-[1.02] active:scale-95"
              >
                Resume
              </button>

              <button
                type="button"
                onClick={handleReturnToMenu}
                className="inline-flex w-full items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-white transition hover:bg-white/20 hover:scale-[1.02] active:scale-95"
              >
                Return to Menu
              </button>

              <button
                type="button"
                onClick={handleQuit}
                className="inline-flex w-full items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-red-200 transition hover:bg-red-500/20 hover:border-red-500/50 hover:scale-[1.02] active:scale-95"
              >
                Quit Desktop
              </button>
            </div>

            <div className="flex justify-center">
              <MusicControls />
            </div>
          </div>
        </div>
      </CornerFrame>
    </div>
  );
}