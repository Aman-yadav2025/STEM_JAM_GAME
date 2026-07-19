import { SceneManager } from '../scene/SceneManager';
import { useStore } from '../state/store';

export default function App() {
  const setControls = useStore((state) => state.setControls);
  const fuel = useStore((state) => state.ship.fuel);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* 3D Render Layer */}
      <div className="absolute inset-0 z-0">
        <SceneManager />
      </div>

      {/* Tailwind UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6">
        {/* Top HUD */}
        <header className="flex justify-between items-start text-white font-mono drop-shadow-md">
          <div>
            <h1 className="text-2xl font-bold tracking-widest text-cyan-400">ORBITAL SIM</h1>
            <p className="text-sm mt-1">PROPELLANT: {fuel.toFixed(1)} kg</p>
          </div>
        </header>

        {/* Bottom Controls */}
        <footer className="flex justify-center pb-8 pointer-events-auto">
          <div className="flex gap-4 bg-gray-900/80 p-4 rounded-xl border border-gray-700 backdrop-blur-sm">
            <button 
              onMouseDown={() => setControls('prograde', 1.0)} //[cite: 1]
              onMouseUp={() => setControls(null, 0)} //[cite: 1]
              className="px-6 py-2 bg-green-600/80 hover:bg-green-500 rounded text-white font-bold transition-colors"
            >
              PROGRADE BURN
            </button>
            <button 
              onMouseDown={() => setControls('retrograde', 1.0)} //[cite: 1]
              onMouseUp={() => setControls(null, 0)} //[cite: 1]
              className="px-6 py-2 bg-red-600/80 hover:bg-red-500 rounded text-white font-bold transition-colors"
            >
              RETROGRADE BURN
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}