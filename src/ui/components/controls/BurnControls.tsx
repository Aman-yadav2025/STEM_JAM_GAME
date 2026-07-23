import { CornerFrame } from '../hud/CornerFrame';
import { useStore } from '../../../state/store';

export function BurnControls() {
  const manualThrottle = useStore((state) => state.manualThrottle);
  const setManualThrottle = useStore((state) => state.setManualThrottle);

  return (
    <CornerFrame accent="#4FB4E8" className="pointer-events-auto">
      <div className="space-y-4">
        <div className="space-y-2 text-[11px] uppercase tracking-[0.25em] text-white/70">
          <div className="font-semibold text-white">Flight Controls</div>
          <div>W / S — pitch</div>
          <div>A / D — yaw</div>
          <div>Q / E — roll</div>
          <div>Space — thrust forward</div>
        </div>

        {/* Throttle Slider */}
        <div className="pt-2 border-t border-white/10">
          <div className="flex justify-between text-[10px] uppercase tracking-widest text-white/70 mb-1">
            <span>Manual Throttle</span>
            <span className="text-blue-300 font-bold">{Math.round(manualThrottle)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={manualThrottle}
            onChange={(e) => setManualThrottle(Number(e.target.value))}
            className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-400 hover:accent-blue-300 transition-all focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />
        </div>
      </div>
    </CornerFrame>
  );
}
