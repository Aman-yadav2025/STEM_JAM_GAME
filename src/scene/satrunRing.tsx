import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../state/store';

export function SaturnRings() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;

    // 1. Fetch Saturn's live moving position from the physics store
    const state = useStore.getState();
    const saturn = state.bodies.find((b) => b.name === 'Saturn');

    if (saturn) {
      // 2. Snap the ring center directly to Saturn's coordinates
      meshRef.current.position.set(saturn.position.x, saturn.position.y, saturn.position.z);
    }
  });

  // Saturn's visual radius is 52. Let's make the rings span from 65 to 110.
  return (
    <mesh ref={meshRef}>
      <ringGeometry args={[65, 110, 64]} />
      <meshBasicMaterial 
        color="#c2b280" 
        side={THREE.DoubleSide} 
        transparent 
        opacity={0.6} 
      />
    </mesh>
  );
}