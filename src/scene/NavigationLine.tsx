import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../state/store';

// Draws a straight line to the currently selected navigation target (set via
// store.ts's setNavigationTarget) as a distinct guide line, separate from
// TrajectoryLine's live gravity-only coast preview.
export function NavigationLine() {
  const targetName = useStore((state) => state.navigationTargetName);
  
  const targetBody = useMemo(() => {
    if (!targetName) return null;
    return useStore.getState().bodies.find((b) => b.name === targetName) || null;
  }, [targetName]);
  
  const pointerRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (pointerRef.current && targetBody) {
      pointerRef.current.position.set(targetBody.position.x, targetBody.position.y, targetBody.position.z);
      // Make the ring slowly rotate or scale for a nice UI effect
      pointerRef.current.rotation.x += 0.01;
    }
  });

  const navigationPath = useStore((state) => state.navigationPath);

  if (navigationPath.length < 2) return null;

  const points = navigationPath.map((p) => [p.x, p.y, p.z] as [number, number, number]);

  return (
    <group>
      <Line
        points={points}
        color="#00ff88"
        lineWidth={2}
        transparent
        opacity={0.4}
        dashed
        dashScale={20}
        dashSize={1}
        gapSize={1}
      />
      {targetBody && (
        <mesh ref={pointerRef}>
          <ringGeometry args={[targetBody.radius * 1.5, targetBody.radius * 1.8, 32]} />
          <meshBasicMaterial color="#00ff88" side={THREE.DoubleSide} transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}
