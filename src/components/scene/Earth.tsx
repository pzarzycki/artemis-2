import { useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';

interface EarthProps {
  gmstRad: number;
}

export default function Earth({ gmstRad }: EarthProps) {
  const earthRef = useRef<THREE.Mesh>(null!);
  const cloudsRef = useRef<THREE.Mesh>(null!);

  const [dayMap, nightMap, normalMap, specMap, cloudsMap] = useLoader(TextureLoader, [
    '/textures/earth_day_8k.jpg',
    '/textures/earth_night_8k.jpg',
    '/textures/earth_normal_8k.jpg',
    '/textures/earth_specular_8k.jpg',
    '/textures/earth_clouds_8k.jpg',
  ]);

  useFrame(() => {
    if (earthRef.current) {
      earthRef.current.rotation.z = gmstRad;
    }
    // Clouds drift ~10% faster than surface rotation
    if (cloudsRef.current) {
      cloudsRef.current.rotation.z = gmstRad * 1.1;
    }
  });

  return (
    <>
      {/* 1 unit = 1 km, Earth radius = 6371 km */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[6371, 256, 128]} />
        <meshPhongMaterial
          map={dayMap}
          emissiveMap={nightMap}
          emissive={new THREE.Color(0.8, 0.7, 0.4)}
          emissiveIntensity={0.6}
          normalMap={normalMap}
          specularMap={specMap}
          specular={new THREE.Color(0.3, 0.3, 0.3)}
          shininess={25}
        />
      </mesh>

      {/* Cloud layer — slightly above surface, semi-transparent */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[6371 * 1.005, 256, 128]} />
        <meshPhongMaterial
          map={cloudsMap}
          alphaMap={cloudsMap}
          transparent
          opacity={0.85}
          depthWrite={false}
          side={THREE.FrontSide}
        />
      </mesh>
    </>
  );
}
