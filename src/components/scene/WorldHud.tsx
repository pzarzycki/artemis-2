import { useEffect, useMemo, useRef } from 'react';
import { Hud, OrthographicCamera, Text } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OBLIQUITY_J2000_RAD } from '../../lib/ephemeris/constants';

function createRingGeometry(radius: number, segments = 96) {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const theta = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, 0));
  }
  return new THREE.BufferGeometry().setFromPoints(points);
}

function HudCamera({ width, height }: { width: number; height: number }) {
  const cameraRef = useRef<THREE.OrthographicCamera>(null);

  useEffect(() => {
    if (!cameraRef.current) return;
    cameraRef.current.left = -width / 2;
    cameraRef.current.right = width / 2;
    cameraRef.current.top = height / 2;
    cameraRef.current.bottom = -height / 2;
    cameraRef.current.updateProjectionMatrix();
  }, [width, height]);

  return (
    <OrthographicCamera
      ref={cameraRef}
      makeDefault
      near={0.1}
      far={100}
      position={[0, 0, 10]}
      up={[0, 0, 1]}
    />
  );
}

function IndicatorOverlay({
  mainCamera,
  width,
  height,
}: {
  mainCamera: THREE.Camera;
  width: number;
  height: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const axesHelper = useMemo(() => {
    const helper = new THREE.AxesHelper(30);
    const materials = Array.isArray(helper.material) ? helper.material : [helper.material];
    for (const material of materials) {
      material.depthTest = false;
      material.toneMapped = false;
    }
    helper.renderOrder = 1000;
    return helper;
  }, []);
  const equatorGeometry = useMemo(() => createRingGeometry(26), []);
  const eclipticGeometry = useMemo(() => createRingGeometry(26), []);
  const equatorMaterial = useMemo(
    () => new THREE.LineBasicMaterial({ color: '#cfd8dc', transparent: true, opacity: 0.72, depthTest: false, toneMapped: false }),
    [],
  );
  const eclipticMaterial = useMemo(
    () => new THREE.LineBasicMaterial({ color: '#f4d35e', transparent: true, opacity: 0.95, depthTest: false, toneMapped: false }),
    [],
  );
  const equatorLine = useMemo(() => new THREE.LineLoop(equatorGeometry, equatorMaterial), [equatorGeometry, equatorMaterial]);
  const eclipticLine = useMemo(() => new THREE.LineLoop(eclipticGeometry, eclipticMaterial), [eclipticGeometry, eclipticMaterial]);

  useEffect(() => () => {
    axesHelper.dispose();
    equatorGeometry.dispose();
    eclipticGeometry.dispose();
    equatorMaterial.dispose();
    eclipticMaterial.dispose();
  }, [axesHelper, equatorGeometry, eclipticGeometry, equatorMaterial, eclipticMaterial]);

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.quaternion.copy(mainCamera.quaternion).invert();
  });

  return (
    <group position={[width / 2 - 74, height / 2 - 78, 0]}>
      <group ref={groupRef}>
        <primitive object={axesHelper} />
        <primitive object={equatorLine} />
        <group rotation={[OBLIQUITY_J2000_RAD, 0, 0]}>
          <primitive object={eclipticLine} />
        </group>
      </group>
      <Text
        position={[34, 20, 0]}
        fontSize={7}
        color="#cfd8dc"
        anchorX="left"
        anchorY="middle"
      >
        Eq
      </Text>
      <Text
        position={[34, 8, 0]}
        fontSize={7}
        color="#f4d35e"
        anchorX="left"
        anchorY="middle"
      >
        Ecl
      </Text>
      <Text
        position={[34, -8, 0]}
        fontSize={7}
        color="#ff4d4f"
        anchorX="left"
        anchorY="middle"
      >
        X
      </Text>
      <Text
        position={[46, -8, 0]}
        fontSize={7}
        color="#57d657"
        anchorX="left"
        anchorY="middle"
      >
        Y
      </Text>
      <Text
        position={[58, -8, 0]}
        fontSize={7}
        color="#4da6ff"
        anchorX="left"
        anchorY="middle"
      >
        Z
      </Text>
    </group>
  );
}

export default function WorldHud() {
  const mainCamera = useThree((state) => state.camera);
  const { width, height } = useThree((state) => state.size);

  return (
    <Hud renderPriority={2}>
      <HudCamera width={width} height={height} />
      <IndicatorOverlay mainCamera={mainCamera} width={width} height={height} />
    </Hud>
  );
}
