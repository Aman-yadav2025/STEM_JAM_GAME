import React from 'react';
import { useStore } from '../state/store';

export const GameOverModal: React.FC = () => {
  const startNewGame = useStore((s) => s.startNewGame);
  const returnToMenu = useStore((s) => s.returnToMainMenu);
  const storyProgress = useStore((s) => s.storyProgress);

  const isVictory = storyProgress >= 10;

  return (
    <div className={`absolute inset-0 z-40 flex items-center justify-center pointer-events-auto ${isVictory ? 'bg-cyan-950/90' : 'bg-black/80'} backdrop-blur-md`}>
      <div className={`p-8 rounded-xl border ${isVictory ? 'border-cyan-400/50 bg-black/60 text-cyan-100 shadow-[0_0_50px_rgba(34,211,238,0.3)]' : 'border-white/20 text-white'} w-[560px] shadow-2xl`}>
        <h2 className={`text-3xl font-bold mb-4 ${isVictory ? 'text-emerald-400 uppercase tracking-widest' : ''}`}>
          {isVictory ? 'VACCINE SECURED' : 'Mission Failed'}
        </h2>
        <p className={`mb-6 leading-relaxed ${isVictory ? 'text-cyan-200' : ''}`}>
          {isVictory 
            ? 'The return probe has successfully breached the atmosphere, delivering the Hollow Phage vaccine to Earth. Your sacrifice will not be forgotten.' 
            : 'Your ship was destroyed. Systems offline.'}
        </p>
        <div className="flex gap-4 justify-end">
          <button
            className={`px-4 py-2 rounded font-bold transition-colors ${isVictory ? 'bg-emerald-500 hover:bg-emerald-400 text-black' : 'bg-white hover:bg-gray-200 text-black'}`}
            onClick={() => startNewGame()}
          >
            {isVictory ? 'Play Again' : 'New Game'}
          </button>
          <button
            className={`px-4 py-2 rounded border transition-colors ${isVictory ? 'border-cyan-500/50 hover:bg-cyan-500/20 text-cyan-300' : 'border-white/20 hover:bg-white/10'}`}
            onClick={() => returnToMenu(false)}
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverModal;
