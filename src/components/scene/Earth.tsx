import { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import { LocalAxes } from './DebugAxes';

interface EarthProps {
  position: [number, number, number];
  gmstRad: number;
}

export default function Earth({ position, gmstRad }: EarthProps) {
  const earthRef = useRef<THREE.Mesh>(null!);
  const cloudsRef = useRef<THREE.Mesh>(null!);
  const [dayMap, nightMap, normalMap, specMap, cloudsMap] = useLoader(TextureLoader, [
    '/textures/earth_day_8k.jpg',
    '/textures/earth_night_8k.jpg',
    '/textures/earth_normal_8k.jpg',
    '/textures/earth_specular_8k.jpg',
    '/textures/earth_clouds_8k.jpg',
  ]);

  // Memoize color constants so they're not recreated every render
  const emissiveColor = useMemo(() => new THREE.Color(0.8, 0.7, 0.4), []);
  const specularColor = useMemo(() => new THREE.Color(0.3, 0.3, 0.3), []);

  useFrame(() => {
    if (earthRef.current) {
      // rotation.x = π/2: corrects sphere geometry (pole is +Y) to ECI frame (pole is +Z)
      // rotation.z = gmstRad: Earth rotates around ECI Z (north pole)
      // No longitude offset: texture u=0.5 (prime meridian) maps to sphere local +X = ECI +X at GMST=0
      earthRef.current.rotation.set(Math.PI / 2, 0, gmstRad);
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.set(Math.PI / 2, 0, gmstRad * 1.002);
    }
  });

  return (
    <group position={position}>
      {/* 1 unit = 1 km, Earth radius = 6371 km */}
      <mesh ref={earthRef}>
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
        <LocalAxes size={9000} />
      </mesh>

      {/* Cloud layer — slightly above surface, semi-transparent */}
      <mesh ref={cloudsRef} renderOrder={1}>
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
    </group>
  );
}
