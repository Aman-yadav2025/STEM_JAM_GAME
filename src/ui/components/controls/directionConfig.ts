import type { BurnDirection } from '../../../physics/constants';

export interface DirectionConfig {
  direction: BurnDirection;
  label: string;
  short: string;
  accent: string;       // tailwind arbitrary hex for bg/border
  accentGlow: string;   // matching glow color for active state
}

export const DIRECTION_CONFIG: Record<BurnDirection, DirectionConfig> = {
  prograde:   { direction: 'prograde',   label: 'PROGRADE',    short: 'PRO',  accent: '#4ADE80', accentGlow: 'rgba(74,222,128,0.5)' },
  retrograde: { direction: 'retrograde', label: 'RETROGRADE',  short: 'RETRO', accent: '#F87171', accentGlow: 'rgba(248,113,113,0.5)' },
  radialOut:  { direction: 'radialOut',  label: 'RADIAL OUT',  short: 'R-OUT', accent: '#4FB4E8', accentGlow: 'rgba(79,180,232,0.5)' },
  radialIn:   { direction: 'radialIn',   label: 'RADIAL IN',   short: 'R-IN',  accent: '#3B82C4', accentGlow: 'rgba(59,130,196,0.5)' },
  normal:     { direction: 'normal',     label: 'NORMAL',      short: 'NML',  accent: '#C084FC', accentGlow: 'rgba(192,132,252,0.5)' },
  velocityMatch: { direction: 'velocityMatch', label: 'VEL MATCH', short: 'VM', accent: '#FACC15', accentGlow: 'rgba(250,204,21,0.5)' },
  antinormal: { direction: 'antinormal', label: 'ANTINORMAL',  short: 'A-NML', accent: '#9333EA', accentGlow: 'rgba(147,51,234,0.5)' },
  intercept: { direction: 'intercept', label: 'INTERCEPT', short: 'INT', accent: '#FB923C', accentGlow: 'rgba(251,146,60,0.5)' },
  avoid: { direction: 'avoid', label: 'AVOID', short: 'AVD', accent: '#F59E0B', accentGlow: 'rgba(245,158,11,0.5)' },
  orbitTangent: { direction: 'orbitTangent', label: 'ORBIT TANGENT', short: 'OT', accent: '#22C55E', accentGlow: 'rgba(34,197,94,0.5)' },
};