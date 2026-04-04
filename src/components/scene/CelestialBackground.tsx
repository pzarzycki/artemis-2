import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { useMissionStore } from '../../store/missionStore';
import { getStarMapPath, type StarMapResolution } from '../../config/starmaps';

const SKY_RADIUS_KM = 800_000_000;
const loader = new EXRLoader();
const textureCache = new Map<StarMapResolution, THREE.DataTexture>();
const pendingTextureLoads = new Map<StarMapResolution, Promise<THREE.DataTexture>>();

async function loadStarMapTexture(resolution: StarMapResolution) {
  const cached = textureCache.get(resolution);
  if (cached) return cached;

  const pending = pendingTextureLoads.get(resolution);
  if (pending) return pending;

  const promise = loader.loadAsync(getStarMapPath(resolution)).then((loaded) => {
    loaded.wrapS = THREE.RepeatWrapping;
    loaded.wrapT = THREE.ClampToEdgeWrapping;
    loaded.repeat.x = -1;
    loaded.repeat.y = 1;
    loaded.offset.x = 1;
    loaded.offset.y = 0;
    loaded.colorSpace = THREE.LinearSRGBColorSpace;
    loaded.needsUpdate = true;
    textureCache.set(resolution, loaded);
    pendingTextureLoads.delete(resolution);
    return loaded;
  });

  pendingTextureLoads.set(resolution, promise);
  return promise;
}

export default function CelestialBackground() {
  const meshRef = useRef<THREE.Mesh>(null);
  const camera = useThree((state) => state.camera);
  const skyExposure = useMissionStore((state) => state.skyExposure);
  const starMapResolution = useMissionStore((state) => state.starMapResolution);
  const setStarMapLoading = useMissionStore((state) => state.setStarMapLoading);
  const [texture, setTexture] = useState<THREE.DataTexture | null>(null);

  useEffect(() => {
    let isActive = true;
    setStarMapLoading(true);

    loadStarMapTexture(starMapResolution)
      .then((loaded) => {
        if (!isActive) return;
        setTexture((previous) => {
          if (previous === loaded) return previous;
          return loaded;
        });
        setStarMapLoading(false);
      })
      .catch((error) => {
        console.warn(`[Sky] Failed to load ${getStarMapPath(starMapResolution)}`, error);
        if (isActive) {
          setStarMapLoading(false);
        }
      });

    return () => {
      isActive = false;
      setStarMapLoading(false);
    };
  }, [setStarMapLoading, starMapResolution]);

  const material = useMemo(() => {
    if (!texture) return null;
    return new THREE.ShaderMaterial({
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
    });
  }, [skyExposure, texture]);

  useEffect(() => () => {
    material?.dispose();
  }, [material]);

  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.position.copy(camera.position);
  });

  if (!material) return null;

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
