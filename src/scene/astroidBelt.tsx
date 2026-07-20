import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AsteroidData {
  radius: number;
  speed: number;
  angle: number;
  size: number;
}

export function AsteroidBelt({ count = 600 }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // 1. Generate static tracking metrics for each rock once
  const asteroids = useMemo(() => {
    const list: AsteroidData[] = [];
    for (let i = 0; i < count; i++) {
      list.push({
        // Randomly distribute across the gap between Mars (1300) and Jupiter (1900)
        radius: 1500 + Math.random() * 200,
        // Keplerian approximation: closer objects orbit faster
        speed: 0.05 + Math.random() * 0.05,
        // Distribute around the full circle orbit path
        angle: Math.random() * Math.PI * 2,
        // Minor size variations
        size: 1.5 + Math.random() * 3,
      });
    }
    return list;
  }, [count]);

  // 2. Animate positions along orbital paths inside the render loop
  useFrame((state, delta) => {
    if (!meshRef.current) return;

    asteroids.forEach((asteroid, i) => {
      // Advance individual angles over time
      asteroid.angle += asteroid.speed * delta;

      const x = Math.cos(asteroid.angle) * asteroid.radius;
      const y = Math.sin(asteroid.angle) * asteroid.radius;

      // Update dummy object properties
      dummy.position.set(x, y, 0);
      dummy.scale.set(asteroid.size, asteroid.size, asteroid.size);
      dummy.updateMatrix();

      // Apply the transformation matrix to the instanced GPU slot
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    // We use a basic low-poly sphere geometry for the rocks
    <instancedMesh ref={meshRef} args={[null as any, null as any, count]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial color="#64748b" />
    </instancedMesh>
  );
}