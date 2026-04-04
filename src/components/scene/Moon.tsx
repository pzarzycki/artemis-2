import { useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import { assetUrl } from '../../config/assets';
import type { Vec3 } from '../../lib/coordinates/types';
import { LocalAxes } from './DebugAxes';

interface MoonProps {
  position: Vec3;
  orientation: [number, number, number]; // [poleRA_deg, poleDec_deg, W_deg]
  showAxes: boolean;
}

export default function Moon({ position, orientation, showAxes }: MoonProps) {
  const [albedoMap, normalMap] = useLoader(TextureLoader, [
    assetUrl('assets/textures/moon_8k.jpg'),
    assetUrl('assets/textures/moon_normal_8k.jpg'),
  ]);

  // The outer group is the Moon body-fixed frame. The inner mesh gets only the
  // sphere-geometry correction that moves the map pole from local +Y to body +Z.
  const bodyQuaternion = useMemo(() => moonOrientationToQuaternion(orientation), [orientation]);

  return (
    <group
      position={position}
      quaternion={bodyQuaternion}
    >
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        {/* Moon radius = 1737.4 km */}
        <sphereGeometry args={[1737.4, 128, 64]} />
        <meshStandardMaterial
          map={albedoMap}
          normalMap={normalMap}
          roughness={0.95}
          metalness={0.0}
        />
      </mesh>
      <LocalAxes size={2600} visible={showAxes} />
    </group>
  );
}

/**
 * Convert IAU Moon orientation [poleRA, poleDec, W] (degrees)
 * to a body-to-inertial quaternion for the Moon body frame.
 * poleRA and poleDec define the north pole direction;
 * W is the prime meridian angle from the ascending node of the ICRF equator.
 */
function moonOrientationToQuaternion([poleRA, poleDec, W]: [number, number, number]): THREE.Quaternion {
  const DEG = Math.PI / 180;
  // The three rotations (using ZXZ Euler angles): α₀+90°, 90°-δ₀, W
  const alpha = (poleRA + 90) * DEG;
  const delta = (90 - poleDec) * DEG;
  const w = W * DEG;
  // We use ZXZ (intrinsic) — THREE.Euler only does XYZ, so we build a quaternion
  const q = new THREE.Quaternion();
  const qZ1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), alpha);
  const qX  = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), delta);
  const qZ2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), w);
  q.multiplyQuaternions(qZ1, qX).multiply(qZ2);
  return q;
}
