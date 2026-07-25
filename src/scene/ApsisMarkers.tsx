import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useStore } from '../state/store';
import { getDominantBody } from '../physics/gravity';
import type { CelestialBody } from '../physics/constants';
import type { Vector3 } from '../physics/vector3';

export function ApsisMarkers() {
  const trajectoryPath = useStore((state) => state.trajectoryPath);

  const peRef = useRef<THREE.Mesh>(null);
  const apRef = useRef<THREE.Mesh>(null);

  const worldPos = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera }) => {
    if (peRef.current) {
      peRef.current.getWorldPosition(worldPos);
      const dist = camera.position.distanceTo(worldPos);
      peRef.current.scale.setScalar(Math.max(1, dist * 0.005));
    }
    if (apRef.current) {
      apRef.current.getWorldPosition(worldPos);
      const dist = camera.position.distanceTo(worldPos);
      apRef.current.scale.setScalar(Math.max(1, dist * 0.005));
    }
  });

  const apsisData = useMemo(() => {
    if (!trajectoryPath || trajectoryPath.length < 10) return null;

    const shipPosition = useStore.getState().ship.position;
    const bodies = useStore.getState().bodies as CelestialBody[];

    const dominantBody = getDominantBody(shipPosition, bodies);
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
  }, [trajectoryPath]);

  if (!apsisData || !apsisData.periapsisPt || !apsisData.apoapsisPt) return null;

  return (
    <group>
      {/* Periapsis (Perigee) Marker */}
      <mesh ref={peRef} position={[apsisData.periapsisPt.x, apsisData.periapsisPt.y, apsisData.periapsisPt.z]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial color="#00ffff" depthTest={false} />
        <Html position={[2, 0, 0]} center>
          <div className="bg-black/60 text-[#00ffff] px-1 py-0.5 rounded text-[10px] font-mono border border-[#00ffff]/30 whitespace-nowrap pointer-events-none">
            PE: {Math.round(apsisData.periapsisDist)}km
          </div>
        </Html>
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
        <lineDashedMaterial color="#00ffff" dashSize={2} gapSize={2} transparent opacity={0.3} />
      </line>

      {/* Apoapsis (Apogee) Marker */}
      <mesh ref={apRef} position={[apsisData.apoapsisPt.x, apsisData.apoapsisPt.y, apsisData.apoapsisPt.z]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial color="#ff00ff" depthTest={false} />
        <Html position={[2, 0, 0]} center>
          <div className="bg-black/60 text-[#ff00ff] px-1 py-0.5 rounded text-[10px] font-mono border border-[#ff00ff]/30 whitespace-nowrap pointer-events-none">
            AP: {Math.round(apsisData.apoapsisDist)}km
          </div>
        </Html>
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
        <lineDashedMaterial color="#ff00ff" dashSize={2} gapSize={2} transparent opacity={0.3} />
      </line>
    </group>
  );
}
