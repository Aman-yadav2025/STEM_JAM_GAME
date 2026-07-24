import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../state/store';
import { getDominantBody } from '../physics/gravity';
import type { CelestialBody } from '../physics/constants';
import type { Vector3 } from '../physics/vector3';

export function ApsisMarkers() {
  const trajectoryPath = useStore((state) => state.trajectoryPath);
  const bodies = useStore((state) => state.bodies);
  const shipPosition = useStore((state) => state.ship.position);

  const peRef = useRef<THREE.Mesh>(null);
  const apRef = useRef<THREE.Mesh>(null);

  useFrame(({ camera }) => {
    if (peRef.current) {
      const dist = camera.position.distanceTo(peRef.current.position);
      peRef.current.scale.setScalar(dist * 0.005);
    }
    if (apRef.current) {
      const dist = camera.position.distanceTo(apRef.current.position);
      apRef.current.scale.setScalar(dist * 0.005);
    }
  });

  const apsisData = useMemo(() => {
    if (!trajectoryPath || trajectoryPath.length < 10) return null;

    const dominantBody = getDominantBody(shipPosition, bodies as CelestialBody[]);
    if (!dominantBody) return null;

    let minDst = Infinity;
    let maxDst = -Infinity;
    let periapsisPt: Vector3 | null = null;
    let apoapsisPt: Vector3 | null = null;

    for (const pt of trajectoryPath) {
      const dst = pt.distanceTo(dominantBody.position);
      if (dst < minDst) {
        minDst = dst;
        periapsisPt = pt;
      }
      if (dst > maxDst) {
        maxDst = dst;
        apoapsisPt = pt;
      }
    }

    return {
      planetCenter: dominantBody.position,
      periapsisPt,
      periapsisDist: minDst,
      apoapsisPt,
      apoapsisDist: maxDst,
    };
  }, [trajectoryPath, shipPosition, bodies]);

  if (!apsisData || !apsisData.periapsisPt || !apsisData.apoapsisPt) return null;

  return (
    <group>
      {/* Periapsis (Perigee) Marker */}
      <mesh ref={peRef} position={[apsisData.periapsisPt.x, apsisData.periapsisPt.y, apsisData.periapsisPt.z]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color="#4ade80" />
      </mesh>
      {/* Line to Periapsis */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[
              new Float32Array([
                apsisData.planetCenter.x, apsisData.planetCenter.y, apsisData.planetCenter.z,
                apsisData.periapsisPt.x, apsisData.periapsisPt.y, apsisData.periapsisPt.z,
              ]),
              3,
            ]}
          />
        </bufferGeometry>
        <lineDashedMaterial color="#4ade80" dashSize={2} gapSize={2} transparent opacity={0.3} />
      </line>

      {/* Apoapsis (Apogee) Marker */}
      <mesh ref={apRef} position={[apsisData.apoapsisPt.x, apsisData.apoapsisPt.y, apsisData.apoapsisPt.z]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color="#f87171" />
      </mesh>
      {/* Line to Apoapsis */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[
              new Float32Array([
                apsisData.planetCenter.x, apsisData.planetCenter.y, apsisData.planetCenter.z,
                apsisData.apoapsisPt.x, apsisData.apoapsisPt.y, apsisData.apoapsisPt.z,
              ]),
              3,
            ]}
          />
        </bufferGeometry>
        <lineDashedMaterial color="#f87171" dashSize={2} gapSize={2} transparent opacity={0.3} />
      </line>
    </group>
  );
}
