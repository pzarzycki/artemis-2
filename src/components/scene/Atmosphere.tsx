import * as THREE from 'three';
import { EARTH_RADIUS_KM } from '../../lib/ephemeris/constants';

/**
 * Atmospheric rim glow around Earth using a Fresnel shader.
 * Rendered as a slightly larger transparent sphere — the glow
 * is only visible on the limb (edge-on to the camera).
 */
export default function Atmosphere() {
  const atmosphereRadius = EARTH_RADIUS_KM * 1.025; // ~160 km above surface

  const material = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-worldPos.xyz);
        gl_Position = projectionMatrix * worldPos;
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;

      void main() {
        // Fresnel: glows on the edge (perpendicular to view)
        float fresnel = pow(1.0 - abs(dot(vNormal, vViewDir)), 3.5);
        vec3 atmosphereColor = vec3(0.3, 0.6, 1.0); // blue atmosphere
        float alpha = fresnel * 0.65;
        gl_FragColor = vec4(atmosphereColor * fresnel, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.FrontSide,
  });

  return (
    <mesh material={material}>
      <sphereGeometry args={[atmosphereRadius, 64, 32]} />
    </mesh>
  );
}
