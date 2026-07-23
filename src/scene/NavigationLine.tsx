import { Line, Ring } from '@react-three/drei';
import { useStore } from '../state/store';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';

// Renders the precomputed navigation route (see navigationPlanner.ts /
// store.ts's setNavigationTarget) as a distinct guide line, separate from
// TrajectoryLine's live gravity-only coast preview.
export function NavigationLine() {
  const navigationPath = useStore((state) => state.navigationPath);
  const targetName = useStore((state) => state.navigationTargetName);
  const bodies = useStore((state) => state.bodies);
  
  const targetBody = bodies.find((b) => b.name === targetName);
  
  const pointerRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (pointerRef.current && targetBody) {
      pointerRef.current.position.set(targetBody.position.x, targetBody.position.y, targetBody.position.z);
      // Make the ring slowly rotate or scale for a nice UI effect
      pointerRef.current.rotation.x = Math.PI / 2;
      pointerRef.current.rotation.z += 0.02;
    }
  });

  if (navigationPath.length < 2) return null;

  const points = navigationPath.map((p) => [p.x, p.y, p.z] as [number, number, number]);

  return (
    <>
      <Line
        points={points}
        color="#4ade80"
        lineWidth={2.5}
        dashed={true}
        dashSize={3}
        gapSize={3}
        transparent
        opacity={0.85}
      />
      {targetBody && (
        <Ring
          ref={pointerRef}
          args={[targetBody.radius * 1.5, targetBody.radius * 1.8, 32]}
        >
          <meshBasicMaterial color="#4ade80" transparent opacity={0.6} side={2} />
        </Ring>
      )}
    </>
  );
}
