import { useRef, useMemo } from 'react';
import { useFrame, extend, type ThreeElement } from '@react-three/fiber';
import * as THREE from 'three';
import { predictPath, estimateOrbitSteps } from '../physics/trajectoryPredictor';
import type { MovingBody } from '../physics/orbitPath';
import { useStore } from '../state/store';

// Register THREE.Line under a name that doesn't collide with the SVG <line>
// intrinsic — this is the standard R3F workaround for this exact ambiguity.
extend({ Line_: THREE.Line });

declare module '@react-three/fiber' {
  interface ThreeElements {
    line_: ThreeElement<typeof THREE.Line>;
  }
}

interface TrajectoryLineProps {
  maxSteps?: number;
  minSteps?: number;
  recomputeEveryNFrames?: number;
  color?: string;
}

export function TrajectoryLine({
  maxSteps = 1e5,
  minSteps = 50,
  recomputeEveryNFrames = 60,
  color = '#F0E1CE',
}: TrajectoryLineProps) {
  const bodies = useStore((state) => state.bodies) as MovingBody[];

  const capacity = maxSteps + 1;
  const positions = useMemo(() => new Float32Array(capacity * 3), [capacity]);
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const lineRef = useRef<THREE.Line>(null);
  const frameCount = useRef(0);

  useFrame(() => {
    frameCount.current++;
    if (frameCount.current % recomputeEveryNFrames !== 0) return;

    const { ship, time, setTrajectoryPath } = useStore.getState();

    const dynamicSteps = estimateOrbitSteps(ship.position, ship.velocity, bodies, maxSteps, minSteps);
    const path = predictPath(ship.position, ship.velocity, bodies, dynamicSteps, time);
    setTrajectoryPath(path);

    for (let i = 0; i < path.length; i++) {
      positions[i * 3] = path[i].x;
      positions[i * 3 + 1] = path[i].y;
      positions[i * 3 + 2] = path[i].z;
    }

    const geometry = geometryRef.current;
    if (!geometry) return;

    geometry.setDrawRange(0, path.length);
    geometry.attributes.position.needsUpdate = true;
    geometry.computeBoundingSphere();

    lineRef.current?.computeLineDistances();
  });

  return (
    <line_ ref={lineRef}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineDashedMaterial color={color} dashSize={2} gapSize={3} transparent opacity={0.6} />
    </line_>
  );
}