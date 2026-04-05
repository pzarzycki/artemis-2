import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Vec3 } from '../../lib/coordinates/types';
import {
  ORION_CM_DIAMETER_KM,
  ORION_CM_HEIGHT_KM,
  ORION_CM_NOSE_DIAMETER_KM,
  ORION_ESM_DIAMETER_KM,
  ORION_ESM_LENGTH_KM,
  ORION_HEAT_SHIELD_DEPTH_KM,
  ORION_INTERFACE_RING_LENGTH_KM,
  ORION_MAIN_ENGINE_EXIT_DIAMETER_KM,
  ORION_MAIN_ENGINE_LENGTH_KM,
  ORION_SOLAR_PANEL_THICKNESS_KM,
  ORION_SOLAR_PANELS_PER_WING,
  ORION_SOLAR_ROOT_OFFSET_KM,
  ORION_SOLAR_WING_LENGTH_KM,
  ORION_SOLAR_WING_WIDTH_KM,
} from '../../lib/ephemeris/constants';
import { LocalAxes } from './DebugAxes';

interface SpacecraftProps {
  position: Vec3;
  posECI: Vec3;
  velECI: Vec3;
  showAxes: boolean;
}

const VISUAL_SCALE = 1000;
const CM_BASE_RADIUS = ORION_CM_DIAMETER_KM / 2;
const CM_NOSE_RADIUS = ORION_CM_NOSE_DIAMETER_KM / 2;
const CM_CENTER_Z = ORION_CM_HEIGHT_KM / 2;
const ESM_RADIUS = ORION_ESM_DIAMETER_KM / 2;
const ESM_CENTER_Z = -ORION_ESM_LENGTH_KM / 2;
const ARRAY_ROOT_RADIUS = ESM_RADIUS + ORION_SOLAR_ROOT_OFFSET_KM;
const ARRAY_ROOT_Z = -ORION_ESM_LENGTH_KM * 0.32;
const PANEL_LENGTH = ORION_SOLAR_WING_LENGTH_KM / ORION_SOLAR_PANELS_PER_WING;
const PANEL_GAP = PANEL_LENGTH * 0.08;
const MARKER_FADE_IN_DISTANCE_KM = 800;
const MARKER_FADE_OUT_DISTANCE_KM = 80;
const AXES_SIZE_KM = 0.03;
function createVisibilityMarkerGeometry() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
  return geometry;
}

function getCrewModuleRadiusAt(zFromInterface: number) {
  const t = THREE.MathUtils.clamp(zFromInterface / ORION_CM_HEIGHT_KM, 0, 1);
  return THREE.MathUtils.lerp(CM_BASE_RADIUS, CM_NOSE_RADIUS, t);
}

function buildBodyFrame(posECI: Vec3, velECI: Vec3) {
  const zAxis = new THREE.Vector3(...velECI).normalize();
  const radial = new THREE.Vector3(...posECI);

  if (radial.lengthSq() === 0) {
    radial.set(1, 0, 0);
  }

  const xAxis = radial.addScaledVector(zAxis, -radial.dot(zAxis)).normalize();
  if (xAxis.lengthSq() === 0) {
    xAxis.set(1, 0, 0);
    if (Math.abs(xAxis.dot(zAxis)) > 0.99) xAxis.set(0, 1, 0);
    xAxis.addScaledVector(zAxis, -xAxis.dot(zAxis)).normalize();
  }

  const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();

  return new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
}

export default function Spacecraft({ position, posECI, velECI, showAxes }: SpacecraftProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const markerMaterialRef = useRef<THREE.PointsMaterial>(null);
  const markerGeometry = useMemo(() => createVisibilityMarkerGeometry(), []);

  useFrame(({ camera }) => {
    if (!groupRef.current) return;
    groupRef.current.position.set(...position);

    const vel = new THREE.Vector3(...velECI);
    if (vel.lengthSq() > 0) {
      groupRef.current.quaternion.setFromRotationMatrix(buildBodyFrame(posECI, velECI));
    }

    if (markerMaterialRef.current) {
      const distance = camera.position.distanceTo(groupRef.current.position);
      markerMaterialRef.current.opacity = THREE.MathUtils.clamp(
        (distance - MARKER_FADE_OUT_DISTANCE_KM)
          / (MARKER_FADE_IN_DISTANCE_KM - MARKER_FADE_OUT_DISTANCE_KM),
        0,
        1,
      );
    }
  });

  return (
    <group ref={groupRef}>
      <group scale={VISUAL_SCALE}>
        <mesh position={[0, 0, CM_CENTER_Z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[CM_NOSE_RADIUS, CM_BASE_RADIUS, ORION_CM_HEIGHT_KM, 24]} />
          <meshStandardMaterial color={0xf1f2ee} metalness={0.12} roughness={0.78} />
        </mesh>

        <mesh position={[0, 0, -ORION_HEAT_SHIELD_DEPTH_KM * 0.4]} rotation={[-Math.PI / 2, 0, 0]}>
          <sphereGeometry args={[CM_BASE_RADIUS, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={0x231710} metalness={0.04} roughness={0.92} />
        </mesh>

        <mesh
          position={[0, 0, ORION_CM_HEIGHT_KM + ORION_INTERFACE_RING_LENGTH_KM * 0.35]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry
            args={[CM_NOSE_RADIUS * 0.72, CM_NOSE_RADIUS * 0.88, ORION_INTERFACE_RING_LENGTH_KM, 24]}
          />
          <meshStandardMaterial color={0xd2d5da} metalness={0.2} roughness={0.58} />
        </mesh>

        {Array.from({ length: 4 }, (_, index) => {
          const angle = (index * Math.PI) / 2 + Math.PI / 4;
          const z = ORION_CM_HEIGHT_KM * 0.72;
          const radius = getCrewModuleRadiusAt(z) * 0.98;
          const tilt = -Math.atan((CM_BASE_RADIUS - CM_NOSE_RADIUS) / ORION_CM_HEIGHT_KM);
          return (
            <mesh
              key={`window-${index}`}
              position={[Math.cos(angle) * radius, Math.sin(angle) * radius, z]}
              rotation={[0, tilt, angle]}
            >
              <boxGeometry args={[0.0005, 0.00016, 0.0009]} />
              <meshStandardMaterial color={0x253246} metalness={0.45} roughness={0.22} />
            </mesh>
          );
        })}

        {Array.from({ length: 8 }, (_, index) => {
          const angle = (index * Math.PI) / 4;
          const z = ORION_CM_HEIGHT_KM * 0.86;
          const radius = getCrewModuleRadiusAt(z) * 1.02;
          return (
            <mesh
              key={`rcs-${index}`}
              position={[Math.cos(angle) * radius, Math.sin(angle) * radius, z]}
              rotation={[0, 0, angle - Math.PI / 2]}
            >
              <cylinderGeometry args={[0.00005, 0.00008, 0.00024, 10]} />
              <meshStandardMaterial color={0xcfd4d9} metalness={0.72} roughness={0.35} />
            </mesh>
          );
        })}

        <mesh position={[0, 0, 0]}>
          <torusGeometry args={[ESM_RADIUS * 0.92, ORION_INTERFACE_RING_LENGTH_KM * 0.45, 12, 32]} />
          <meshStandardMaterial color={0x9399a6} metalness={0.48} roughness={0.48} />
        </mesh>

        <mesh position={[0, 0, ESM_CENTER_Z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[ESM_RADIUS, ESM_RADIUS, ORION_ESM_LENGTH_KM, 8]} />
          <meshStandardMaterial color={0x9aa2af} metalness={0.62} roughness={0.42} />
        </mesh>

        {Array.from({ length: 8 }, (_, index) => {
          const angle = (index * Math.PI) / 4;
          const radius = ESM_RADIUS * 1.02;
          return (
            <mesh
              key={`radiator-${index}`}
              position={[
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                -ORION_ESM_LENGTH_KM * 0.42,
              ]}
              rotation={[0, 0, angle]}
            >
              <boxGeometry args={[0.0013, 0.00018, ORION_ESM_LENGTH_KM * 0.56]} />
              <meshStandardMaterial color={0x5b626d} metalness={0.38} roughness={0.66} />
            </mesh>
          );
        })}

        {Array.from({ length: 8 }, (_, index) => {
          const angle = (index * Math.PI) / 4 + Math.PI / 8;
          const radius = ESM_RADIUS * 1.06;
          return (
            <mesh
              key={`aux-pod-${index}`}
              position={[
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                -ORION_ESM_LENGTH_KM * 0.18,
              ]}
              rotation={[0, 0, angle - Math.PI / 2]}
            >
              <cylinderGeometry args={[0.00011, 0.00011, 0.00042, 8]} />
              <meshStandardMaterial color={0xa6acb6} metalness={0.74} roughness={0.28} />
            </mesh>
          );
        })}

        {Array.from({ length: 24 }, (_, index) => {
          const angle = (index * Math.PI) / 12;
          const radius = ESM_RADIUS * 1.05;
          return (
            <mesh
              key={`thruster-${index}`}
              position={[
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                -ORION_ESM_LENGTH_KM * 0.72,
              ]}
              rotation={[0, 0, angle - Math.PI / 2]}
            >
              <cylinderGeometry args={[0.00003, 0.00005, 0.00018, 8]} />
              <meshStandardMaterial color={0xd0b07b} metalness={0.8} roughness={0.34} />
            </mesh>
          );
        })}

        <mesh
          position={[0, 0, -ORION_ESM_LENGTH_KM - ORION_MAIN_ENGINE_LENGTH_KM * 0.4]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry
            args={[ORION_MAIN_ENGINE_EXIT_DIAMETER_KM * 0.18, ORION_MAIN_ENGINE_EXIT_DIAMETER_KM / 2, ORION_MAIN_ENGINE_LENGTH_KM, 20]}
          />
          <meshStandardMaterial color={0x5d5350} metalness={0.72} roughness={0.44} />
        </mesh>

        {Array.from({ length: 4 }, (_, wingIndex) => {
          const angle = wingIndex * (Math.PI / 2);
          return (
            <group
              key={`wing-${wingIndex}`}
              position={[
                Math.cos(angle) * ARRAY_ROOT_RADIUS,
                Math.sin(angle) * ARRAY_ROOT_RADIUS,
                ARRAY_ROOT_Z,
              ]}
              rotation={[0, 0, angle]}
            >
              <mesh>
                <cylinderGeometry args={[0.00008, 0.00008, 0.00065, 8]} />
                <meshStandardMaterial color={0x8e949f} metalness={0.62} roughness={0.34} />
              </mesh>

              {Array.from({ length: ORION_SOLAR_PANELS_PER_WING }, (_, panelIndex) => {
                const panelCenter = PANEL_LENGTH * (panelIndex + 0.5) + PANEL_GAP * panelIndex;
                return (
                  <group key={`panel-${panelIndex}`} position={[panelCenter, 0, 0]}>
                    {panelIndex > 0 && (
                      <mesh position={[-(PANEL_LENGTH + PANEL_GAP) / 2, 0, 0]}>
                        <cylinderGeometry args={[0.00003, 0.00003, ORION_SOLAR_WING_WIDTH_KM * 0.92, 6]} />
                        <meshStandardMaterial color={0xa4aab4} metalness={0.66} roughness={0.32} />
                      </mesh>
                    )}
                    <mesh>
                      <boxGeometry args={[PANEL_LENGTH, ORION_SOLAR_WING_WIDTH_KM, ORION_SOLAR_PANEL_THICKNESS_KM]} />
                      <meshStandardMaterial color={0x1f4276} metalness={0.18} roughness={0.72} />
                    </mesh>
                    <mesh>
                      <boxGeometry args={[PANEL_LENGTH * 0.96, ORION_SOLAR_WING_WIDTH_KM * 0.92, ORION_SOLAR_PANEL_THICKNESS_KM * 0.45]} />
                      <meshStandardMaterial color={0x2d5ea0} metalness={0.08} roughness={0.6} />
                    </mesh>
                  </group>
                );
              })}
            </group>
          );
        })}

        <LocalAxes size={AXES_SIZE_KM} visible={showAxes} />
      </group>

      <points frustumCulled={false} renderOrder={1000}>
        <primitive object={markerGeometry} attach="geometry" />
        <pointsMaterial
          ref={markerMaterialRef}
          color={0x7ef0ff}
          size={8}
          sizeAttenuation={false}
          transparent
          opacity={0}
          depthWrite={false}
          depthTest={false}
          toneMapped={false}
        />
      </points>

    </group>
  );
}
