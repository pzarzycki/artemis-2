import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { useMissionStore } from '../../store/missionStore';

const SKY_RADIUS_KM = 800_000_000;

export default function CelestialBackground() {
  const meshRef = useRef<THREE.Mesh>(null);
  const camera = useThree((state) => state.camera);
  const skyExposure = useMissionStore((state) => state.skyExposure);
  const texture = useLoader(EXRLoader, '/textures/starmap_2020_4k.exr');

  useEffect(() => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.x = -1;
    texture.repeat.y = 1;
    texture.offset.x = 1;
    texture.offset.y = 0;
    texture.colorSpace = THREE.LinearSRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  const material = useMemo(() => (
    new THREE.ShaderMaterial({
      uniforms: {
        skyMap: { value: texture },
        exposure: { value: skyExposure },
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D skyMap;
        uniform float exposure;
        varying vec2 vUv;

        void main() {
          vec3 hdr = texture2D(skyMap, vUv).rgb * exposure;
          vec3 mapped = hdr / (vec3(1.0) + hdr);
          gl_FragColor = vec4(mapped, 1.0);
        }
      `,
      side: THREE.BackSide,
      fog: false,
      toneMapped: false,
      depthWrite: false,
      depthTest: false,
    })
  ), [skyExposure, texture]);

  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.position.copy(camera.position);
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[Math.PI / 2, 0, 0]}
      renderOrder={-1000}
      frustumCulled={false}
    >
      <sphereGeometry args={[SKY_RADIUS_KM, 64, 32]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
