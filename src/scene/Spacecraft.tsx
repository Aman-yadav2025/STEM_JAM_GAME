import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../state/store';
export const SpacecraftMesh = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    
    // Read directly from state to avoid re-renders
    const ship = useStore.getState().ship;
    
    // Apply Vector3 (x, y, z) to the Three.js mesh[cite: 1]
    meshRef.current.position.set(ship.position.x, ship.position.y, ship.position.z);
    const speed = Math.hypot(ship.velocity.x, ship.velocity.y);
    if (speed > 0.0001) {
      meshRef.current.rotation.z = Math.atan2(ship.velocity.y, ship.velocity.x) - Math.PI/2;
    }
  });

  return (
    <mesh ref={meshRef}>
      <coneGeometry args= {[5, 12, 16]} />
      <meshStandardMaterial color="white" />
    </mesh>
  );
};