interface ThrottleSliderProps {
  value: number; // 0..1
  onChange: (value: number) => void;
}

/** Vertical throttle lever — mirrors a physical thrust control rather than a generic horizontal slider. */
export function ThrottleSlider({ value, onChange }: ThrottleSliderProps) {
  return (
    <div className="flex flex-col items-center gap-2 font-mono">
      <span className="text-[10px] tracking-widest text-white/50">{Math.round(value * 100)}%</span>
      <div className="relative h-32 w-6 flex items-center justify-center">
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(value * 100)}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          className="throttle-slider"
          style={{
            width: '128px',
            height: '4px',
            transform: 'rotate(-90deg)',
            accentColor: '#4FB4E8',
          }}
        />
      </div>
      <span className="text-[9px] tracking-widest text-white/30">THR</span>
    </div>
  );
}