import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useRef, useMemo } from 'react';
import { SpacecraftMesh } from './Spacecraft';
import { useGameLoop } from '../game/GameLoop';
import { useStore } from '../state/store';
import { TrajectoryLine } from './TrajectoryLine';

// --- GPU-ACCELERATED SPACE DEBRIS CLUSTER (ORBITING EARTH) ---
const SpaceDebris = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 150;

  const debrisField = useMemo(() => {
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push({
        orbitalRadius: 55 + Math.random() * 90,
        speed: 0.3 + Math.random() * 0.4,
        angle: Math.random() * Math.PI * 2,
        size: 0.4 + Math.random() * 0.8,
        rotSpeedX: Math.random() * 2,
        rotSpeedY: Math.random() * 2,
      });
    }
    return list;
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const earth = useStore.getState().bodies.find((b) => b.name === 'Earth');
    if (!earth) return;

    const t = state.clock.getElapsedTime();
    const dummy = new THREE.Object3D();

    debrisField.forEach((deb, i) => {
      const currentAngle = deb.angle + t * deb.speed;
      const localX = Math.cos(currentAngle) * deb.orbitalRadius;
      const localY = Math.sin(currentAngle) * deb.orbitalRadius;

      dummy.position.set(earth.position.x + localX, earth.position.y + localY, earth.position.z);
      dummy.rotation.set(t * deb.rotSpeedX, t * deb.rotSpeedY, 0);
      dummy.scale.set(deb.size, deb.size, deb.size);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#8395a7" roughness={0.6} metalness={0.8} />
    </instancedMesh>
  );
};

// --- NEW: 50 HIGH-PERFORMANCE INSTANCED COMETS ---
const InstancedComets = () => {
  const coreRef = useRef<THREE.InstancedMesh>(null);
  const tailRef = useRef<THREE.InstancedMesh>(null);
  const count = 50;

  // Generate unique orbital pathways for 50 distinct comets
  const cometsData = useMemo(() => {
    const list = [];
    for (let i = 0; i < count; i++) {
      const a = 800 + Math.random() * 3000;      // Semi-major axis (length)
      const b = 200 + Math.random() * 600;       // Semi-minor axis (narrowness)
      const c = Math.sqrt(a * a - b * b);        // Focal distance offset
      list.push({
        a, b, c,
        speed: 0.03 + Math.random() * 0.07,
        phase: Math.random() * Math.PI * 2,
        orbitRotation: Math.random() * Math.PI * 2, // Angular orbital alignment
        size: 2.0 + Math.random() * 3.5,
      });
    }
    return list;
  }, []);

  useFrame((state) => {
    if (!coreRef.current || !tailRef.current) return;
    const t = state.clock.getElapsedTime();
    
    const dummyCore = new THREE.Object3D();
    const dummyTail = new THREE.Object3D();

    cometsData.forEach((comet, i) => {
      // Standard Keplerian elliptical path tracking
      const angle = t * comet.speed + comet.phase;
      const rawX = Math.cos(angle) * comet.a - comet.c;
      const rawY = Math.sin(angle) * comet.b;

      // Rotate the coordinate space based on this comet's unique orbit slant angle
      const x = rawX * Math.cos(comet.orbitRotation) - rawY * Math.sin(comet.orbitRotation);
      const y = rawX * Math.sin(comet.orbitRotation) + rawY * Math.cos(comet.orbitRotation);

      // 1. Position the core
      dummyCore.position.set(x, y, 0);
      dummyCore.scale.set(comet.size, comet.size, comet.size);
      dummyCore.updateMatrix();
      coreRef.current!.setMatrixAt(i, dummyCore.matrix);

      // 2. Position & align the tail to point straight out away from the Sun center
      const sunDir = new THREE.Vector3(x, y, 0).normalize();
      dummyTail.position.set(x, y, 0);
      
      // Cones point upwards (+Y) by default. Align +Y axis to the radial sun vector
      dummyTail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sunDir);
      
      // Shift tail backwards slightly so it streams directly behind the nucleus core
      const tailLength = comet.size * 5;
      dummyTail.position.add(sunDir.clone().multiplyScalar(tailLength));
      dummyTail.scale.set(comet.size * 0.7, tailLength * 2, comet.size * 0.7);
      
      dummyTail.updateMatrix();
      tailRef.current!.setMatrixAt(i, dummyTail.matrix);
    });

    coreRef.current.instanceMatrix.needsUpdate = true;
    tailRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      {/* Cores Instanced Layer */}
      <instancedMesh ref={coreRef} args={[undefined, undefined, count]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial color="#a5f3fc" emissive="#22d3ee" emissiveIntensity={1.2} />
      </instancedMesh>

      {/* Tails Instanced Layer */}
      <instancedMesh ref={tailRef} args={[undefined, undefined, count]}>
        <coneGeometry args={[1, 1, 8, 1, true]} />
        <meshBasicMaterial color="#e0f7fa" transparent opacity={0.35} side={THREE.DoubleSide} />
      </instancedMesh>
    </>
  );
};

// --- GPU-ACCELERATED INSTANCED FIXED ASTEROID BELT ---
const AsteroidBelt = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 600;

  const asteroids = useMemo(() => {
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push({
        radius: 1450 + Math.random() * 250,
        speed: 0.1 + Math.random() * 0.15,
        angle: Math.random() * Math.PI * 2,
        size: 1.0 + Math.random() * 1.8,
      });
    }
    return list;
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    const dummy = new THREE.Object3D();

    asteroids.forEach((ast, i) => {
      const currentAngle = ast.angle + t * ast.speed * 0.1;
      const x = Math.cos(currentAngle) * ast.radius;
      const y = Math.sin(currentAngle) * ast.radius;

      dummy.position.set(x, y, 0);
      dummy.scale.set(ast.size, ast.size, ast.size);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshStandardMaterial color="#576574" roughness={0.9} />
    </instancedMesh>
  );
};

// --- NEW: 100 HIGH-PERFORMANCE ROAMING ASTEROIDS ---
const RoamingAsteroids = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 100;

  const roamers = useMemo(() => {
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push({
        // Scattered anywhere from inside Mercury out past Neptune (200 to 4200)
        radiusX: 200 + Math.random() * 4000,
        radiusY: 150 + Math.random() * 3500,
        speed: 0.05 + Math.random() * 0.15,
        angle: Math.random() * Math.PI * 2,
        tilt: Math.random() * Math.PI * 2,
        size: 1.5 + Math.random() * 3.0,
      });
    }
    return list;
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    const dummy = new THREE.Object3D();

    roamers.forEach((roam, i) => {
      const currentAngle = roam.angle + t * roam.speed * 0.2;
      const rawX = Math.cos(currentAngle) * roam.radiusX;
      const rawY = Math.sin(currentAngle) * roam.radiusY;

      // Give them completely skewed orbital angles so they wander across the system crosses
      const x = rawX * Math.cos(roam.tilt) - rawY * Math.sin(roam.tilt);
      const y = rawX * Math.sin(roam.tilt) + rawY * Math.cos(roam.tilt);

      dummy.position.set(x, y, 0);
      dummy.rotation.set(t * 0.2, t * 0.3, 0);
      dummy.scale.set(roam.size, roam.size, roam.size);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 5, 5]} />
      <meshStandardMaterial color="#7f8c8d" roughness={0.85} metalness={0.2} />
    </instancedMesh>
  );
};

// --- MAIN SIMULATION ENGINE ---
const Simulation = () => {
  useGameLoop();
  const bodies = useStore((state) => state.bodies);

  const earthTexture = useLoader(THREE.TextureLoader, '/textures/earth.jpg');
  const sunTexture = useLoader(THREE.TextureLoader, '/textures/sun.jpg');
  const moonTexture = useLoader(THREE.TextureLoader, '/textures/moon.jpg');
  const mercuryTexture = useLoader(THREE.TextureLoader, '/textures/mercury.jpg');
  const venusTexture = useLoader(THREE.TextureLoader, '/textures/venus.jpg');
  const marsTexture = useLoader(THREE.TextureLoader, '/textures/mars.jpg');
  const jupiterTexture = useLoader(THREE.TextureLoader, '/textures/jupiter.jpg');
  const uranusTexture = useLoader(THREE.TextureLoader, '/textures/uranus.jpg');
  const neptuneTexture = useLoader(THREE.TextureLoader, '/textures/neptune.jpg');

  return (
    <>
      <SpacecraftMesh />
      
      {/* Environmental Graphic Infrastructure Layers */}
      <AsteroidBelt />
      <RoamingAsteroids />
      <SpaceDebris />
      <InstancedComets />

      {bodies.map((body, i) => (
        <mesh key={i} position={[body.position.x, body.position.y, body.position.z]}>
          <sphereGeometry args={[body.radius, 32, 32]} />
          
          {body.name === 'Earth' ? ( <meshStandardMaterial map={earthTexture} roughness={1} metalness={0} /> ) 
          : body.name === 'Sun' ? (<meshStandardMaterial map={sunTexture} emissive="#ffff88" emissiveMap={sunTexture} emissiveIntensity={1.5}/>) 
          : body.name === 'Moon' ? ( <meshStandardMaterial map={moonTexture} roughness={1} metalness={0} /> )
          : body.name === 'Mars' ? ( <meshStandardMaterial map={marsTexture} roughness={1} metalness={0} /> ) 
          : body.name === 'Jupiter' ? ( <meshStandardMaterial map={jupiterTexture} roughness={1} metalness={0} /> )
          : body.name === 'Uranus' ? ( <meshStandardMaterial map={uranusTexture} roughness={1} metalness={0} /> )
          : body.name === 'Neptune' ? ( <meshStandardMaterial map={neptuneTexture} roughness={1} metalness={0} /> )
          : body.name === 'Mercury' ? ( <meshStandardMaterial map={mercuryTexture} roughness={1} metalness={0} /> )
          : body.name === 'Venus' ? ( <meshStandardMaterial map={venusTexture}  /> )
          : ( <meshStandardMaterial color={body.color} />)}

          {body.name === 'Saturn' && (
            <mesh>
              <ringGeometry args={[68, 120, 64]} />
              <meshStandardMaterial color="#e2d4a8" side={THREE.DoubleSide} transparent opacity={0.7} roughness={0.8} />
            </mesh>
          )}
        </mesh>
      ))}
      
      <TrajectoryLine />
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
    <Canvas camera={{ position: [0, 30, 140], fov: 80, near: 0.1, far: 30000 }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 0, 0]} intensity={2.5} distance={20000} decay={1} />
      <Stars radius={12000} depth={60} count={3000} factor={5} />
      <Simulation />
      <CameraRig />
    </Canvas>
  );
};