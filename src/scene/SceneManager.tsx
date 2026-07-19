import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useRef } from 'react';
import { SpacecraftMesh } from './Spacecraft';
import { useGameLoop } from '../game/GameLoop';
import { useStore } from '../state/store';

const Simulation = () => {
  useGameLoop(); // Start the physics accumulator
  const bodies = useStore((state) => state.bodies);
  const earthTexture = useLoader(THREE.TextureLoader, '/textures/earth.jpg');
  const sunTexture = useLoader(THREE.TextureLoader, '/textures/sun.jpg');
  return (
    <>
      <SpacecraftMesh />
{bodies.map((body, i) => (
  <mesh key={i} position={[body.position.x, body.position.y, body.position.z]}>
    <sphereGeometry args={[body.radius, 32, 32]} />
    {body.name === 'Earth' ? (
      <meshStandardMaterial map={earthTexture} />
    ) : body.name === 'Sun' ? (
      <meshStandardMaterial
        map={sunTexture}
        emissive="#ffff88"
        emissiveMap={sunTexture}
        emissiveIntensity={1.5}
      />
    ) : (
      <meshStandardMaterial color={body.color} />
    )}
  </mesh>
))}
    </>
  );
};

const CameraRig = () => {
  const ship = useStore((state) => state.ship);
  const { camera, gl } = useThree();
  const controlsRef = useRef<any>(null);
  const previousTarget = useRef<THREE.Vector3 | null>(null);
  const offset = new THREE.Vector3(0, 30, 140);

  useFrame(() => {
    const target = new THREE.Vector3(ship.position.x, ship.position.y, ship.position.z);

    if (!previousTarget.current) {
      camera.position.copy(target.clone().add(offset));
      camera.lookAt(target);
    } else {
      const delta = target.clone().sub(previousTarget.current);
      camera.position.add(delta);
    }

    previousTarget.current = target;

    if (controlsRef.current) {
      controlsRef.current.target.copy(target);
      controlsRef.current.update();
    }
  });

  return <OrbitControls ref={controlsRef} camera={camera} domElement={gl.domElement} />;
};

export const SceneManager = () => {
  return (
    <Canvas camera={{ position: [0, 30, 140], fov: 60 }}>
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 0, 0]} intensity={2} />
      <Stars radius={300} depth={50} count={5000} factor={4} />
      <Simulation />
      <CameraRig />
    </Canvas>
  );
};