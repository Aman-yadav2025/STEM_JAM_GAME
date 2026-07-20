import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../state/store';

export const SpacecraftMesh = () => {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/ship.glb');
  const shipModel = useMemo(() => scene.clone(true), [scene]);

  useFrame(() => {
    if (!groupRef.current) return;

    const ship = useStore.getState().ship;
    groupRef.current.position.set(ship.position.x, ship.position.y, ship.position.z);

    const speed = Math.hypot(ship.velocity.x, ship.velocity.y);
    if (speed > 0.0001) {
      groupRef.current.rotation.z = Math.atan2(ship.velocity.y, ship.velocity.x) - Math.PI / 2;
    }
  });

  return (
    <group ref={groupRef} scale={0.35}>
      <primitive object={shipModel} />
    </group>
  );
};