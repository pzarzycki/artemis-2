import type { ThreeEvent } from '@react-three/fiber';
import { useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import { assetUrl } from '../../config/assets';
import { LocalAxes } from './DebugAxes';

interface EarthProps {
  position: [number, number, number];
  gmstRad: number;
  showAxes: boolean;
  onPointerOver?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerMove?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (event: ThreeEvent<PointerEvent>) => void;
}

export default function Earth({
  position,
  gmstRad,
  showAxes,
  onPointerOver,
  onPointerMove,
  onPointerOut,
}: EarthProps) {
  const [dayMap, nightMap, normalMap, specMap, cloudsMap] = useLoader(TextureLoader, [
    assetUrl('assets/textures/earth_day_8k.jpg'),
    assetUrl('assets/textures/earth_night_8k.jpg'),
    assetUrl('assets/textures/earth_normal_8k.jpg'),
    assetUrl('assets/textures/earth_specular_8k.jpg'),
    assetUrl('assets/textures/earth_clouds_8k.jpg'),
  ]);

  // Memoize color constants so they're not recreated every render
  const emissiveColor = useMemo(() => new THREE.Color(0.8, 0.7, 0.4), []);
  const specularColor = useMemo(() => new THREE.Color(0.3, 0.3, 0.3), []);

  return (
    <group position={position} rotation={[0, 0, gmstRad]}>
      {/* 1 unit = 1 km, Earth radius = 6371 km */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <sphereGeometry args={[6371, 128, 64]} />
        <meshPhongMaterial
          map={dayMap}
          emissiveMap={nightMap}
          emissive={emissiveColor}
          emissiveIntensity={0.6}
          normalMap={normalMap}
          specularMap={specMap}
          specular={specularColor}
          shininess={25}
        />
      </mesh>

      {/* Cloud layer — slightly above surface, semi-transparent */}
      <mesh renderOrder={1} rotation={[Math.PI / 2, 0, gmstRad * 0.002]}>
        <sphereGeometry args={[6371 * 1.008, 128, 64]} />
        <meshPhongMaterial
          map={cloudsMap}
          alphaMap={cloudsMap}
          transparent
          opacity={0.75}
          depthWrite={false}
          depthTest={true}
          side={THREE.FrontSide}
        />
      </mesh>

      <mesh onPointerOver={onPointerOver} onPointerMove={onPointerMove} onPointerOut={onPointerOut}>
        <sphereGeometry args={[9000, 48, 24]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <LocalAxes size={9000} visible={showAxes} />
    </group>
  );
}
