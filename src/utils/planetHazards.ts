export interface PlanetHazard {
  id: string;
  name: string;
  type: 'radiation' | 'atmosphere' | 'thermal' | 'debris';
  severity: 'low' | 'moderate' | 'critical';
  description: string;
  evaluator: (telemetry: { altitude: number; velocity: number; distanceToSun?: number }) => boolean;
}

export const PLANET_HAZARDS: PlanetHazard[] = [
  {
      id: 'van_allen_belt',
      name: 'Van Allen Radiation Belt',
      type: 'radiation',
      severity: 'moderate',
      description: 'High-energy charged particles trapped by planetary magnetic field. Electronics and solar arrays undergoing degradation.',
      evaluator: (t) => t.altitude >= 1000 && t.altitude <= 5000,
  },
  {
      id: 'atmospheric_drag',
      name: 'Upper Ionosphere Thermal Friction',
      type: 'atmosphere',
      severity: 'critical',
      description: 'WARNING: Spacecraft encountering residual atmospheric molecules. Rapid orbital decay and thermal stress detected!',
      evaluator: (t) => t.altitude < 150 && t.altitude > 0,
  },
  {
      id: 'solar_flare',
      name: 'Coronal Mass Ejection (CME)',
      type: 'thermal',
      severity: 'critical',
      description: 'Solar radiation storm active! Seek planetary shadow immediately to prevent telemetry failure.',
      evaluator: (t) => (t.distanceToSun ?? 10000) < 2500, // proximity-based hazard
  },
  {
      id: 'orbital_debris_field',
      name: 'Kessler Syndrome Debris Ring',
      type: 'debris',
      severity: 'moderate',
      description: 'Dense concentration of defunct satellite fragments in low orbit. Evasive maneuvering recommended.',
      evaluator: (t) => t.altitude >= 700 && t.altitude <= 900 && t.velocity > 7.5,
  }
];