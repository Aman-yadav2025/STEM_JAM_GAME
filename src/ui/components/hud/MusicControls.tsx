import { useStore } from '../../../state/store';

export const MusicControls: React.FC = () => {
  const musicMuted = useStore((state) => state.musicMuted);
  const musicVolume = useStore((state) => state.musicVolume);
  const setMusicMuted = useStore((state) => state.setMusicMuted);
  const setMusicVolume = useStore((state) => state.setMusicVolume);

  return (
    <div className="w-full max-w-[320px] rounded-2xl border border-slate-800/80 bg-slate-950/90 p-4 shadow-lg shadow-slate-950/30 backdrop-blur pointer-events-auto">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Music Control</p>
          <p className="text-sm font-semibold text-slate-100">Background Score</p>
        </div>
        <button
          onClick={() => setMusicMuted(!musicMuted)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            musicMuted
              ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
              : 'bg-emerald-600 text-slate-950 hover:bg-emerald-500'
          }`}
        >
          {musicMuted ? 'Muted' : 'On'}
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.35em] text-slate-500">
          <span>Volume</span>
          <span>{musicMuted ? 0 : musicVolume}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={musicMuted ? 0 : musicVolume}
          onChange={(e) => setMusicVolume(Number(e.target.value))}
          className="w-full accent-cyan-400"
        />
      </div>
    </div>
  );
};
