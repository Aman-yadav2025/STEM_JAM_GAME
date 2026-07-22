import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const StarfieldBackground: React.FC = () => {
  const starsRef = useRef<THREE.Points>(null);
  const milkyWayRef = useRef<THREE.Mesh>(null);

  // 1. Generate procedural 3D starfield buffer with color and size variations
  const [positions, colors, sizes] = useMemo(() => {
    const count = 6000;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sz = new Float32Array(count);

    const baseColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      // Distribute stars on a large sphere radius around the camera/scene
      const radius = 3000 + Math.random() * 2000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);

      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi);

      // Star color variation (blue-white giants, warm yellow/orange, crisp white)
      const randType = Math.random();
      if (randType > 0.85) {
        baseColor.setHSL(0.6 + Math.random() * 0.1, 0.8, 0.9); // Blueish stars
      } else if (randType > 0.6) {
        baseColor.setHSL(0.1 + Math.random() * 0.1, 0.9, 0.9); // Warm orange/red
      } else {
        baseColor.setHSL(0.15, 0.1, 0.95); // Crisp stellar white
      }

      col[i * 3] = baseColor.r;
      col[i * 3 + 1] = baseColor.g;
      col[i * 3 + 2] = baseColor.b;

      sz[i] = Math.random() * 3 + 1; // Generous size so they are clearly visible
    }

    return [pos, col, sz];
  }, []);

  // 2. Slow subtle rotation of the cosmos for living ambiance
  useFrame((_, delta) => {
    if (starsRef.current) {
      starsRef.current.rotation.y += delta * 0.005;
    }
    if (milkyWayRef.current) {
      milkyWayRef.current.rotation.y += delta * 0.002;
    }
  });

  return (
    <group>
      {/* Procedural Starfield Points */}
      <points ref={starsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[colors, 3]}
          />
          <bufferAttribute
            attach="attributes-size"
            args={[sizes, 1]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={6}
          vertexColors={true}
          transparent={true}
          opacity={0.9}
          sizeAttenuation={true}
          depthWrite={false} // Crucial: prevents stars from occluding planets/Sun
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Milky Way Galactic Band Dome */}
      <mesh ref={milkyWayRef} rotation={[0.4, 0, 0.2]}>
        <sphereGeometry args={[4000, 64, 64]} />
        <meshBasicMaterial
          color="#0b0f19"
          side={THREE.BackSide}
          transparent={true}
          opacity={0.95}
        />
      </mesh>
    </group>
  );
};