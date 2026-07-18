// physics/lagrange.ts
//
// Computes the five Lagrange points for a two-body system (e.g. planet +
// moon). Points are where gravitational + centrifugal forces balance in the
// rotating reference frame of the two-body system.
//
//   L4, L5 — STABLE equilibria. Form an equilateral triangle with the two
//            bodies (60° ahead of / behind the smaller body along its orbit).
//            Closed-form, no solver needed. Good for "settle and stay" gameplay.
//
//   L1, L2, L3 — UNSTABLE saddle points, lie on the line through both bodies.
//                No closed form; solved numerically via Newton's method.
//                Small perturbations grow over time — a ship parked here
//                needs active stationkeeping burns to remain in place, which
//                is the intended skill test for the Lagrange Balance level.

import { G } from './constants';
import type { CelestialBody } from './constants';
import { Vector3 } from './vector3';

export type LagrangePointId = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

export interface LagrangePoint {
  id: LagrangePointId;
  position: Vector3;
  stable: boolean;
}

/**
 * Computes all 5 Lagrange points for a primary body (e.g. planet) and a
 * secondary body (e.g. moon) orbiting it. Assumes secondary orbits primary
 * in a circular orbit along the +x axis from primary for simplicity of setup;
 * rotate the result afterward if your moon sits at a different angle.
 */
export function computeLagrangePoints(
  primary: CelestialBody,
  secondary: CelestialBody
): LagrangePoint[] {
  const d = distanceBetween(primary.position, secondary.position);
  const massRatio = secondary.mass / primary.mass;

  const l1r = solveL1(d, massRatio);
  const l2r = solveL2(d, massRatio);
  const l3r = solveL3(d, massRatio);

  // Direction unit vector from primary to secondary, used to place points
  // along (L1, L2, L3) or off (L4, L5) that axis.
  const dir = {
    x: (secondary.position.x - primary.position.x) / d,
    y: (secondary.position.y - primary.position.y) / d,
  };
  const perp = new Vector3(-dir.y,dir.x,0);

  const points: LagrangePoint[] = [
    {
      id: 'L1',
      position: new Vector3(
        primary.position.x + dir.x * (d - l1r),
        primary.position.y + dir.y * (d - l1r),
        0
      ),
      stable: false,
    },
    {
      id: 'L2',
      position: new Vector3(
        primary.position.x + dir.x * (d + l2r),
        primary.position.y + dir.y * (d + l2r),
        0
    ),
      stable: false,
    },
    {
      id: 'L3',
      position:  new Vector3(
        primary.position.x - dir.x * l3r,
        primary.position.y - dir.y * l3r,
        0,
    ),
      stable: false,
    },
    {
      id: 'L4',
      position: equilateralPoint(primary.position, secondary.position, d, perp, 1),
      stable: true,
    },
    {
      id: 'L5',
      position: equilateralPoint(primary.position, secondary.position, d, perp, -1),
      stable: true,
    },
  ];

  return points;
}

function distanceBetween(a: Vector3, b: Vector3): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// L4/L5 sit at the apex of an equilateral triangle formed with the two
// bodies — exact closed form, no iteration required.
function equilateralPoint(
  primaryPos: Vector3,
  secondaryPos: Vector3,
  d: number,
  perp: Vector3,
  side: 1 | -1
): Vector3 {
  const midX = (primaryPos.x + secondaryPos.x) / 2;
  const midY = (primaryPos.y + secondaryPos.y) / 2;
  const height = (Math.sqrt(3) / 2) * d;

  return new Vector3(
    midX + side * perp.x * height,
    midY + side * perp.y * height,
    0
  );
}

// --- Newton's method solvers for L1 / L2 / L3 ---
// These solve the standard restricted three-body force-balance equations
// along the primary-secondary axis. `r` in each function is distance from
// the SECONDARY body (L1, L2) or from the PRIMARY body (L3), matching the
// classical formulation. massRatio = m_secondary / m_primary.

function solveL1(d: number, massRatio: number): number {
  // initial guess from the small-mass-ratio approximation
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
  let r = d * (1 - (7 / 12) * (massRatio / (1 + massRatio))); // classical approx starting point
  for (let i = 0; i < 50; i++) {
    const f =
      1 / Math.pow(r, 2) + massRatio / Math.pow(d + r, 2) - (1 + massRatio) * r / Math.pow(d, 3);
    const fPrime =
      -2 / Math.pow(r, 3) - (2 * massRatio) / Math.pow(d + r, 3) - (1 + massRatio) / Math.pow(d, 3);
    r = r - f / fPrime;
  }
  return r;
}

