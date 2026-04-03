import { useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import type { Vec3 } from '../../lib/coordinates/types';

interface MoonProps {
  posECI: Vec3;
  orientation: [number, number, number]; // [poleRA_deg, poleDec_deg, W_deg]
}

export default function Moon({ posECI, orientation }: MoonProps) {
  const [albedoMap, normalMap] = useLoader(TextureLoader, [
    '/textures/moon_8k.jpg',
    '/textures/moon_normal_8k.jpg',
  ]);

  // Build orientation quaternion from IAU Moon pole + prime meridian
  const euler = moonOrientationToEuler(orientation);

  return (
    <mesh
      position={posECI}
      rotation={euler}
    >
      {/* Moon radius = 1737.4 km */}
      <sphereGeometry args={[1737.4, 128, 64]} />
      <meshStandardMaterial
        map={albedoMap}
        normalMap={normalMap}
        roughness={0.95}
        metalness={0.0}
      />
    </mesh>
  );
}

/**
 * Convert IAU Moon orientation [poleRA, poleDec, W] (degrees)
 * to Euler angles for Three.js (intrinsic ZYZ convention).
 * poleRA and poleDec define the north pole direction;
 * W is the prime meridian angle from the ascending node of the ICRF equator.
 */
function moonOrientationToEuler([poleRA, poleDec, W]: [number, number, number]): THREE.Euler {
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
  return new THREE.Euler().setFromQuaternion(q);
}
