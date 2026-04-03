import { useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';

interface EarthProps {
  gmstRad: number;
}

export default function Earth({ gmstRad }: EarthProps) {
  const meshRef = useRef<THREE.Mesh>(null!);

  // Load textures — fallback to solid color if not yet downloaded
  const [dayMap, nightMap, normalMap, specMap] = useLoader(TextureLoader, [
    '/textures/earth_day_8k.jpg',
    '/textures/earth_night_8k.jpg',
    '/textures/earth_normal_8k.jpg',
    '/textures/earth_specular_8k.jpg',
  ]);

  // Apply GMST rotation each frame
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.z = gmstRad;
    }
  });

  return (
    <mesh ref={meshRef}>
      {/* 1 unit = 1 km, Earth radius = 6371 km */}
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
  );
}
