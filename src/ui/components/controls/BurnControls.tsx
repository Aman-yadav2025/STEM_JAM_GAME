import { CornerFrame } from '../hud/CornerFrame';

export function BurnControls() {
  return (
    <CornerFrame accent="#4FB4E8" className="pointer-events-auto">
      <div className="space-y-2 text-[11px] uppercase tracking-[0.25em] text-white/70">
        <div className="font-semibold text-white">Flight Controls</div>
        <div>W / S — pitch</div>
        <div>A / D — yaw</div>
        <div>Q / E — roll</div>
        <div>Space — thrust forward</div>
      </div>
    </CornerFrame>
  );
}
