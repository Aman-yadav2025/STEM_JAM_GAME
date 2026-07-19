import type { DirectionConfig } from './directionConfig';

interface DirectionButtonProps {
  config: DirectionConfig;
  active: boolean;
  onFire: () => void;
  onRelease: () => void;
  className?: string;
}

/**
 * Single burn-axis button. Uses pointer capture so release always fires on
 * this element even if the pointer drags off mid-press — fixes the
 * "thrust stuck on" bug you get with plain onMouseDown/onMouseUp.
 */
export function DirectionButton({ config, active, onFire, onRelease, className = '' }: DirectionButtonProps) {
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    onFire();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    onRelease();
  };

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      aria-pressed={active}
      className={`relative select-none font-mono text-[10px] font-bold tracking-widest py-3 px-2
        border transition-all duration-100 ${className}`}
      style={{
        borderColor: active ? config.accent : 'rgba(255,255,255,0.15)',
        backgroundColor: active ? `${config.accent}26` : 'rgba(255,255,255,0.03)',
        color: active ? config.accent : 'rgba(255,255,255,0.6)',
        boxShadow: active ? `0 0 12px ${config.accentGlow}` : 'none',
      }}
    >
      {config.short}
    </button>
  );
}