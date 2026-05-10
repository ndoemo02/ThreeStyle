'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Portal effect — swirling vortex for room transitions.
 * Uses a custom shader with animated noise pattern.
 */
export function PortalEffect({ position, radius = 1.5, active = true }: {
  position: [number, number, number];
  radius?: number;
  active?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uRadius: { value: radius },
    uActive: { value: active ? 1.0 : 0.0 },
    uColor1: { value: new THREE.Color('#1a0033') },
    uColor2: { value: new THREE.Color('#4400aa') },
    uColor3: { value: new THREE.Color('#00ccff') },
  }), [radius, active]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
    if (meshRef.current) {
      // Slow rotation
      meshRef.current.rotation.z += 0.005;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <circleGeometry args={[radius, 64]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform float uRadius;
          uniform float uActive;
          uniform vec3 uColor1;
          uniform vec3 uColor2;
          uniform vec3 uColor3;
          varying vec2 vUv;

          // Simplex-like noise
          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
          }

          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));
            return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
          }

          float fbm(vec2 p) {
            float value = 0.0;
            float amplitude = 0.5;
            for (int i = 0; i < 4; i++) {
              value += amplitude * noise(p);
              p *= 2.0;
              amplitude *= 0.5;
            }
            return value;
          }

          void main() {
            vec2 center = vUv - 0.5;
            float dist = length(center);
            float angle = atan(center.y, center.x);

            // Swirl pattern
            float swirl = angle + dist * 5.0 - uTime * 2.0;
            vec2 uv = vec2(cos(swirl), sin(swirl)) * dist * 2.0;

            float n = fbm(uv + uTime * 0.5);
            float n2 = fbm(uv * 2.0 - uTime * 0.3);

            // Ring pattern
            float ring = sin(dist * 20.0 - uTime * 3.0) * 0.5 + 0.5;
            ring *= smoothstep(0.5, 0.2, dist);

            // Color mixing
            vec3 col = mix(uColor1, uColor2, n);
            col = mix(col, uColor3, n2 * ring * 0.5);

            // Edge glow
            float edge = smoothstep(0.5, 0.3, dist);
            col += uColor3 * edge * 0.3;

            // Center dark hole
            float hole = smoothstep(0.15, 0.0, dist);
            col = mix(col, uColor1, hole);

            // Fade out when inactive
            float alpha = (1.0 - smoothstep(0.3, 0.5, dist)) * uActive;
            alpha *= 0.8;

            gl_FragColor = vec4(col, alpha);
          }
        `}
      />
    </mesh>
  );
}
