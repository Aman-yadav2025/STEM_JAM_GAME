import { useStore } from '../../../state/store';
import { CornerFrame } from './CornerFrame';

/** Top-left mission readout: propellant gauge + speed. Replaces the old plain-text banner. */
export function StatusHUD() {
  const fuel = useStore((state) => state.ship.fuel);
  const maxFuel = useStore((state) => state.ship.maxFuel);
  const velocity = useStore((state) => state.ship.velocity);

  const fraction = maxFuel > 0 ? fuel / maxFuel : 0;
  const speed = Math.hypot(velocity.x, velocity.y);
  const low = fraction < 0.15;
  const health = useStore((state) => state.ship.health ?? 0);
  const maxHealth = useStore((state) => state.ship.maxHealth ?? 100);

  return (
    <CornerFrame accent={low ? '#F87171' : '#4FB4E8'} className="font-mono text-[#E6E9EF] w-64">
      <div className="flex items-baseline justify-between mb-3">
        <h1 className="text-sm font-bold tracking-[0.2em] text-[#4FB4E8]">ORBITAL SIM</h1>
        <span className="text-[10px] tracking-widest text-white/40">NAV/01</span>
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-[10px] tracking-widest text-white/50 mb-1">
          <span>PROPELLANT</span>
          <span className={low ? 'text-[#F87171]' : 'text-white/70'}>
            {fuel.toFixed(0)} / {maxFuel.toFixed(0)} KG
          </span>
        </div>
        <div className="h-1.5 w-full bg-white/10 overflow-hidden">
          <div
            className="h-full transition-[width] duration-200"
            style={{
              width: `${Math.max(0, Math.min(1, fraction)) * 100}%`,
              backgroundColor: low ? '#F87171' : '#4FB4E8',
            }}
          />
        </div>
      </div>

      <div className="flex justify-between text-[10px] tracking-widest text-white/50">
        <span>VELOCITY</span>
        <span className="text-white/70">{speed.toFixed(2)} U/S</span>
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-[10px] tracking-widest text-white/50 mb-1">
          <span>HULL</span>
          <span className={health / maxHealth < 0.25 ? 'text-[#F87171]' : 'text-white/70'}>
            {health.toFixed(0)} / {maxHealth.toFixed(0)}
          </span>
        </div>
        <div className="h-1.5 w-full bg-white/10 overflow-hidden">
          <div
            className="h-full transition-[width] duration-200"
            style={{
              width: `${Math.max(0, Math.min(1, health / maxHealth)) * 100}%`,
              backgroundColor: health / maxHealth < 0.25 ? '#F87171' : '#4FB4E8',
            }}
          />
        </div>
      </div>
    </CornerFrame>
  );
}