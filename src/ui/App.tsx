import { SceneManager } from '../scene/SceneManager';
import { StatusHUD } from './components/hud/StatusHUD';
import { BurnControls } from './components/controls/BurnControls';

export default function App() {
  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* 3D Render Layer */}
      <div className="absolute inset-0 z-0">
        <SceneManager />
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6">
        <header className="pointer-events-auto w-fit">
          <StatusHUD />
        </header>

        <footer className="flex justify-center pb-4">
          <BurnControls />
        </footer>
      </div>
    </div>
  );
}