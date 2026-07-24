
import type { CelestialBody } from './constants';
import { Vector3 } from './vector3';

export type LagrangePointId = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

export interface LagrangePoint {
  id: LagrangePointId;
  position: Vector3;
  stable: boolean;
}

export function computeLagrangePoints(
  primary: CelestialBody,
  secondary: CelestialBody
): LagrangePoint[] {
  const d = primary.position.distanceTo(secondary.position);
  const massRatio = secondary.mass / primary.mass;

  const l1r = solveL1(d, massRatio);
  const l2r = solveL2(d, massRatio);
  const l3r = solveL3(d, massRatio);

  const dir = secondary.position.subtract(primary.position).normalize();
  const perp = new Vector3(-dir.y, dir.x, 0);

  return [
    { id: 'L1', position: primary.position.add(dir.scale(d - l1r)), stable: false },
    { id: 'L2', position: primary.position.add(dir.scale(d + l2r)), stable: false },
    { id: 'L3', position: primary.position.subtract(dir.scale(l3r)), stable: false },
    { id: 'L4', position: equilateralPoint(primary.position, secondary.position, d, perp, 1), stable: true },
    { id: 'L5', position: equilateralPoint(primary.position, secondary.position, d, perp, -1), stable: true },
  ];
}

function equilateralPoint(
  primaryPos: Vector3,
  secondaryPos: Vector3,
  d: number,
  perp: Vector3,
  side: 1 | -1
): Vector3 {
  const mid = primaryPos.add(secondaryPos).scale(0.5);
  const height = (Math.sqrt(3) / 2) * d;
  return mid.add(perp.scale(side * height));
}

// --- Newton's method solvers for L1 / L2 / L3 ---
// r is distance from the SECONDARY body (L1, L2) or from the PRIMARY body
// (L3). massRatio = m_secondary / m_primary.

function solveL1(d: number, massRatio: number): number {
  let r = d * Math.pow(massRatio / 3, 1 / 3);
  for (let i = 0; i < 50; i++) {
    const f =
      1 / Math.pow(d - r, 2) - massRatio / Math.pow(r, 2) - (1 + massRatio) * (d - r) / Math.pow(d, 3);
    const fPrime =
      2 / Math.pow(d - r, 3) + (2 * massRatio) / Math.pow(r, 3) + (1 + massRatio) / Math.pow(d, 3);
    r = r - f / fPrime;
  }
  return r;
}

function solveL2(d: number, massRatio: number): number {
  let r = d * Math.pow(massRatio / 3, 1 / 3);
  for (let i = 0; i < 50; i++) {
    const f =
      1 / Math.pow(d + r, 2) + massRatio / Math.pow(r, 2) - (1 + massRatio) * (d + r) / Math.pow(d, 3);
    const fPrime =
      -2 / Math.pow(d + r, 3) - (2 * massRatio) / Math.pow(r, 3) - (1 + massRatio) / Math.pow(d, 3);
    r = r - f / fPrime;
  }
  return r;
}

function solveL3(d: number, massRatio: number): number {
  let r = d * (1 - (7 / 12) * (massRatio / (1 + massRatio)));
  for (let i = 0; i < 50; i++) {
    const f =
      1 / Math.pow(r, 2) + massRatio / Math.pow(d + r, 2) - (1 + massRatio) * r / Math.pow(d, 3);
    const fPrime =
      -2 / Math.pow(r, 3) - (2 * massRatio) / Math.pow(d + r, 3) - (1 + massRatio) / Math.pow(d, 3);
    r = r - f / fPrime;
  }
  return r;
}
