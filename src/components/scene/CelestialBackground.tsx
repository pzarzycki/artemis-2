import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { useMissionStore } from '../../store/missionStore';
import { getStarMapPath, type StarMapLayer, type StarMapResolution } from '../../config/starmaps';

const SKY_RADIUS_KM = 800_000_000;
const loader = new EXRLoader();
const textureCache = new Map<string, THREE.DataTexture>();
const pendingTextureLoads = new Map<string, Promise<THREE.DataTexture>>();

function getTextureCacheKey(layer: StarMapLayer, resolution: StarMapResolution) {
  return `${layer}:${resolution}`;
}

async function loadStarMapTexture(layer: StarMapLayer, resolution: StarMapResolution) {
  const cacheKey = getTextureCacheKey(layer, resolution);
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const pending = pendingTextureLoads.get(cacheKey);
  if (pending) return pending;

  const promise = loader.loadAsync(getStarMapPath(layer, resolution)).then((loaded) => {
    loaded.wrapS = THREE.RepeatWrapping;
    loaded.wrapT = THREE.ClampToEdgeWrapping;
    loaded.colorSpace = THREE.LinearSRGBColorSpace;
    loaded.needsUpdate = true;
    textureCache.set(cacheKey, loaded);
    pendingTextureLoads.delete(cacheKey);
    return loaded;
  });

  pendingTextureLoads.set(cacheKey, promise);
  return promise;
}

export default function CelestialBackground() {
  const meshRef = useRef<THREE.Mesh>(null);
  const camera = useThree((state) => state.camera);
  const skyExposure = useMissionStore((state) => state.skyExposure);
  const starMapLayer = useMissionStore((state) => state.starMapLayer);
  const starMapResolution = useMissionStore((state) => state.starMapResolution);
  const setStarMapLoading = useMissionStore((state) => state.setStarMapLoading);
  const [texture, setTexture] = useState<THREE.DataTexture | null>(null);

  useEffect(() => {
    let isActive = true;
    setStarMapLoading(true);

    loadStarMapTexture(starMapLayer, starMapResolution)
      .then((loaded) => {
        if (!isActive) return;
        setTexture((previous) => {
          if (previous === loaded) return previous;
          return loaded;
        });
        setStarMapLoading(false);
      })
      .catch((error) => {
        console.warn(`[Sky] Failed to load ${getStarMapPath(starMapLayer, starMapResolution)}`, error);
        if (isActive) {
          setStarMapLoading(false);
        }
      });

    return () => {
      isActive = false;
      setStarMapLoading(false);
    };
  }, [setStarMapLoading, starMapLayer, starMapResolution]);

  const material = useMemo(() => {
    if (!texture) return null;
    return new THREE.ShaderMaterial({
      uniforms: {
        skyMap: { value: texture },
        exposure: { value: skyExposure },
      },
      vertexShader: `
        varying vec3 vWorldDir;

        void main() {
          vWorldDir = normalize(mat3(modelMatrix) * position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D skyMap;
        uniform float exposure;
        varying vec3 vWorldDir;

        const float PI = 3.1415926535897932384626433832795;

        void main() {
          float ra = atan(vWorldDir.y, vWorldDir.x);
          float u = fract(0.5 - ra / (2.0 * PI));
          float v = 0.5 + asin(clamp(vWorldDir.z, -1.0, 1.0)) / PI;
          vec2 skyUv = vec2(u, v);
          vec3 hdr = texture2D(skyMap, skyUv).rgb * exposure;
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
      renderOrder={-1000}
      frustumCulled={false}
    >
      <sphereGeometry args={[SKY_RADIUS_KM, 64, 32]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
