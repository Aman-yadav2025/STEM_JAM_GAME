import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../state/store';

export const SpacecraftMesh = () => {
  const groupRef = useRef<THREE.Group>(null);
  const flameOuterRef = useRef<THREE.Mesh>(null);
  const flameCoreRef = useRef<THREE.Mesh>(null);
  const { scene } = useGLTF('/ship.glb');
  const shipModel = useMemo(() => scene.clone(true), [scene]);
  const flameGeo = useMemo(() => new THREE.ConeGeometry(0.18, 0.7, 8), []);
  const flameCoreGeo = useMemo(() => new THREE.ConeGeometry(0.1, 0.45, 8), []);
  const flameMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: 0xffcc66, transparent: true, opacity: 0.85, depthWrite: false }),
    []
  );
  const flameCoreMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: 0xfff0a8, transparent: true, opacity: 0.95, depthWrite: false }),
    []
  );

  useFrame((state) => {
    if (!groupRef.current) return;

    const ship = useStore.getState().ship;
    const thrusting = useStore.getState().flightInput.thrusting;

    groupRef.current.position.set(ship.position.x, ship.position.y, ship.position.z);
    groupRef.current.rotation.set(ship.pitch, ship.yaw, ship.roll);

    if (flameOuterRef.current) {
      const outer = flameOuterRef.current;
      outer.scale.set(1, thrusting ? 1 + 0.2 * Math.sin(state.clock.elapsedTime * 28) : 0.0001, 1);
      outer.position.z = thrusting ? -0.5 : -0.05;
      (outer.material as THREE.MeshBasicMaterial).opacity = thrusting ? 0.7 + 0.15 * Math.sin(state.clock.elapsedTime * 20) : 0;
      outer.rotation.set(-Math.PI / 2, 0, 0);
    }

    if (flameCoreRef.current) {
      const core = flameCoreRef.current;
      core.scale.set(0.65, thrusting ? 1.2 + 0.12 * Math.sin(state.clock.elapsedTime * 32) : 0.0001, 0.65);
      core.position.z = thrusting ? -0.25 : -0.02;
      (core.material as THREE.MeshBasicMaterial).opacity = thrusting ? 0.95 + 0.05 * Math.sin(state.clock.elapsedTime * 26) : 0;
      core.rotation.set(-Math.PI / 2, 0, 0);
    }

    if (groupRef.current.children[1]) {
      groupRef.current.children[1].scale.setScalar(thrusting ? 1 + 0.05 * Math.sin(state.clock.elapsedTime * 18) : 0.0001);
    }
  });

  return (
    <group ref={groupRef} scale={0.35}>
      <primitive object={shipModel} />
      <group position={[0, 0.5, -1.7]}>
        <mesh ref={flameOuterRef} geometry={flameGeo} material={flameMaterial} rotation={[Math.PI, 0, 0]} />
        <mesh ref={flameCoreRef} geometry={flameCoreGeo} material={flameCoreMaterial} rotation={[Math.PI, 0, 0]} />
      </group>
    </group>
  );
};