import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { SpacecraftMesh } from './Spacecraft';
import { useGameLoop } from '../game/GameLoop';
import { useStore } from '../state/store';

const Simulation = () => {
  useGameLoop(); // Start the physics accumulator
  const bodies = useStore((state) => state.bodies);

  return (
    <>
      <SpacecraftMesh />
      {bodies.map((body, i) => (
        <mesh key={i} position={[body.position.x, body.position.y, body.position.z]}>
          <sphereGeometry args={[body.radius, 32, 32]} />
          <meshStandardMaterial color={body.color} />
        </mesh>
      ))}
    </>
  );
};

export const SceneManager = () => {
  return (
    <Canvas camera={{ position: [0, 0, 250], fov: 60 }}>
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 0, 0]} intensity={2} />
      <Stars radius={300} depth={50} count={5000} factor={4} />
      <Simulation />
      <OrbitControls />
    </Canvas>
  );
};