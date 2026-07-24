import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../state/store';

export function SolarCoronaEffect() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const [triggerFlare, setTriggerFlare] = useState(false);
  
  useEffect(() => {
    const handleDescent = () => setTriggerFlare(true);
    if (typeof window !== 'undefined') {
      window.addEventListener('solar-descent-complete', handleDescent);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('solar-descent-complete', handleDescent);
      }
    }
  }, []);

  useFrame((state, delta) => {
    if (!meshRef.current || !materialRef.current) return;
    
    const { ship, bodies } = useStore.getState();
    const sun = bodies.find((b) => b.name === 'Sun');
    if (!sun) return;

    meshRef.current.position.set(sun.position.x, sun.position.y, sun.position.z);
    
    const sunDist = ship.position.distanceTo(sun.position);
    
    let scale = sun.radius * 1.05;
    let opacity = 0;
    
    if (sunDist < 50000 && !triggerFlare) {
      opacity = Math.max(0, 1 - (sunDist / 50000)) * 0.4;
      meshRef.current.scale.set(scale, scale, scale);
      materialRef.current.opacity = opacity + Math.sin(state.clock.elapsedTime * 4) * 0.05;
    }
    
    if (triggerFlare) {
       // Massive expansion for the signal broadcast
       scale = sun.radius * 30; 
       opacity = 1.0; 
       meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), delta * 2);
       materialRef.current.opacity = THREE.MathUtils.lerp(materialRef.current.opacity, opacity, delta * 3);
       materialRef.current.color.set('#ffffff'); // Flash white-hot
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshBasicMaterial 
        ref={materialRef} 
        color="#ff6600" 
        transparent 
        opacity={0} 
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
