import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../state/store';

export function AtmosphericFriction() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    if (!meshRef.current || !materialRef.current) return;
    
    const { ship, bodies, gamePhase } = useStore.getState();
    if (gamePhase !== 'Playing') return;

    const earth = bodies.find((b) => b.name === 'Earth');
    if (!earth) return;

    meshRef.current.position.set(ship.position.x, ship.position.y, ship.position.z);
    
    const altitude = ship.position.distanceTo(earth.position) - earth.radius;
    const velocityMag = ship.velocity.magnitude();

    // Friction effect logic: below 85km and moving fast
    let opacity = 0;
    if (altitude > 0 && altitude < 85 && velocityMag > 50) {
      // Fade in effect based on altitude and speed
      const altFactor = 1 - (altitude / 85);
      const velFactor = Math.min(1, (velocityMag - 50) / 100);
      opacity = altFactor * velFactor * 0.8;
      
      // Flicker for realistic burn effect
      opacity *= (0.7 + Math.random() * 0.3);
    }
    
    materialRef.current.opacity = opacity;
    // Scale slightly based on velocity to simulate expanding plasma trail
    const scale = 1.2 + (velocityMag / 200);
    meshRef.current.scale.set(scale, scale, scale);
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial 
        ref={materialRef} 
        color="#ff4400" 
        transparent 
        opacity={0} 
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}
