import React from 'react';
import { useStore } from '../state/store';

export const GameOverModal: React.FC = () => {
  const startNewGame = useStore((s) => s.startNewGame);
  const returnToMenu = useStore((s) => s.returnToMainMenu);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-auto">
      <div className="bg-black/80 backdrop-blur-sm p-8 rounded-xl border border-white/20 text-white w-[520px]">
        <h2 className="text-3xl font-bold mb-4">Mission Failed</h2>
        <p className="mb-6">Your ship was destroyed. Systems offline.</p>
        <div className="flex gap-4 justify-end">
          <button
            className="px-4 py-2 rounded bg-white text-black font-bold"
            onClick={() => startNewGame()}
          >
            New Game
          </button>
          <button
            className="px-4 py-2 rounded border border-white/20"
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
