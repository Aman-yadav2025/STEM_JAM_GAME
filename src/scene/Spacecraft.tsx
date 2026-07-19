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
    meshRef.current.rotation.z = ship.heading; 
  });

  return (
    <mesh ref={meshRef}>
      <coneGeometry args= {[2, 6, 16]} />
      <meshStandardMaterial color="white" />
    </mesh>
  );
};