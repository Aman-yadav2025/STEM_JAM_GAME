import { useState, useCallback } from 'react';
import { useStore } from '../../state/store';
import type { BurnDirection } from '../../physics/constants';
import { DIRECTION_CONFIG } from './directionConfig.ts';
import { DirectionButton } from './DirectionButton.tsx';
import { ThrottleSlider } from './ThrottleSlider.tsx';
import { CornerFrame } from '../hud/CornerFrame.tsx';

/**
 * Burn compass: cardinal directions arranged to echo the RTN frame
 * (radial out/in on the vertical axis, retro/prograde horizontal,
 * normal/antinormal in the top corners) rather than a flat button row.
 * Throttle is a shared lever — whichever direction is held fires at the
 * current throttle setting.
 */
export function BurnControls() {
  const setControls = useStore((state) => state.setControls);
  const [throttle, setThrottle] = useState(1.0);
  const [activeDirection, setActiveDirection] = useState<BurnDirection | null>(null);

  const fire = useCallback((direction: BurnDirection) => {
    setActiveDirection(direction);
    setControls(direction, throttle);
  }, [setControls, throttle]);

  const release = useCallback(() => {
    setActiveDirection(null);
    setControls(null, 0);
  }, [setControls]);

  // If throttle changes mid-burn, keep the live thrust in sync.
  const handleThrottleChange = (value: number) => {
    setThrottle(value);
    if (activeDirection) setControls(activeDirection, value);
  };

  const btn = (direction: BurnDirection, className = '') => (
    <DirectionButton
      config={DIRECTION_CONFIG[direction]}
      active={activeDirection === direction}
      onFire={() => fire(direction)}
      onRelease={release}
      className={className}
    />
  );

  return (
    <CornerFrame accent="#4FB4E8" className="pointer-events-auto flex items-center gap-5">
      <div className="grid grid-cols-3 grid-rows-3 gap-1.5 w-44">
        {btn('normal', 'col-start-1 row-start-1')}
        {btn('radialOut', 'col-start-2 row-start-1')}
        {btn('antinormal', 'col-start-3 row-start-1')}

        {btn('retrograde', 'col-start-1 row-start-2')}
        <div className="col-start-2 row-start-2 flex items-center justify-center text-[9px] tracking-widest text-white/25">
          SHIP
        </div>
        {btn('prograde', 'col-start-3 row-start-2')}

        <div className="col-start-1 row-start-3" />
        {btn('radialIn', 'col-start-2 row-start-3')}
        <div className="col-start-3 row-start-3" />
      </div>

      <div className="h-40 w-px bg-white/10" />

      <ThrottleSlider value={throttle} onChange={handleThrottleChange} />

    </CornerFrame>
  );
}