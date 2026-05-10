import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { useAudioStore } from '../../../stores/useAudioStore';

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
uniform float uStarSpeed;
uniform float uDensity;
uniform float uSpeed;
uniform float uAudioReact;

varying vec2 vUv;

#define NUM_LAYER 3.0
#define PERIOD 2.0
#define STAR_COLOR_CUTOFF 0.5
#define MAT45 mat2(0.707, -0.707, 0.707, 0.707)

float Hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float tri(float x) {
  return abs(fract(x) * 2.0 - 1.0);
}

float trisn(float x) {
  float t = fract(x);
  return 2.0 * (1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0))) - 1.0;
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float Star(vec2 uv, float flare) {
  float d = length(uv);
  // Soft glowing core
  float m = 0.015 / (d + 0.001);
  // Distinct inner circle (kółko) that grows with flare/audio
  float circleRadius = 0.02 + flare * 0.03;
  float circle = smoothstep(circleRadius, circleRadius * 0.8, d);
  
  m += circle * 0.8;
  m *= smoothstep(0.8, 0.2, d);
  return m;
}

vec3 StarLayer(vec2 uv) {
  vec3 col = vec3(0.0);

  vec2 gv = fract(uv) - 0.5; 
  vec2 id = floor(uv);

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y));
      vec2 si = id + vec2(float(x), float(y));
      float seed = Hash21(si);
      float size = fract(seed * 345.32);
      float glossLocal = tri(uStarSpeed / (PERIOD * seed + 1.0));
      float flareSize = smoothstep(0.9, 1.0, size) * glossLocal;

      float red = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 1.0)) + STAR_COLOR_CUTOFF;
      float blu = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 3.0)) + STAR_COLOR_CUTOFF;
      float grn = min(red, blu) * seed;
      vec3 base = vec3(red, grn, blu);

      // Add a slight pink/purple hue to match neon vibe
      float hue = atan(base.g - base.r, base.b - base.r) / (2.0 * 3.14159) + 0.5;
      hue = fract(hue + 160.0 / 360.0);
      float sat = length(base - vec3(dot(base, vec3(0.299, 0.587, 0.114)))) * 0.4;
      float val = max(max(base.r, base.g), base.b);
      base = hsv2rgb(vec3(hue, sat, val));

      // Audio reactivity: increase star size and brightness based on audio
      float star = Star(gv - offset, flareSize + uAudioReact * 0.5);
      vec3 color = base + (base * uAudioReact * 0.5);

      float twinkle = trisn(uTime * uSpeed + seed * 6.2831) * 0.5 + 1.0;
      star *= mix(1.0, twinkle, 0.3);

      col += star * size * color;
    }
  }

  return col;
}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  // Scale UV to mimic a large ceiling plane
  uv *= vec2(15.0, 10.0);

  float autoRotAngle = uTime * 0.05;
  mat2 autoRot = mat2(cos(autoRotAngle), -sin(autoRotAngle), sin(autoRotAngle), cos(autoRotAngle));
  uv = autoRot * uv;

  vec3 col = vec3(0.0);

  for (float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYER) {
    float depth = fract(i + uStarSpeed * uSpeed);
    float scale = mix(20.0 * uDensity, 0.5 * uDensity, depth);
    float fade = depth * smoothstep(1.0, 0.9, depth);
    col += StarLayer(uv * scale + i * 453.32) * fade;
  }

  // Soft purple-blue ambient glow
  vec3 ambient = vec3(0.04, 0.02, 0.08) * (1.0 - length(vUv * 2.0 - 1.0));
  // Boost ambient with audio
  ambient += vec3(0.1, 0.05, 0.2) * uAudioReact;
  
  gl_FragColor = vec4(col + ambient, 1.0);
}
`;

export function GalaxyCeilingMaterial() {
  const { size } = useThree();
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const analyserNode = useAudioStore((state) => state.analyserNode);
  const dataArray = useRef(new Uint8Array(0));

  // Initialize data array when analyser changes
  if (analyserNode && dataArray.current.length !== analyserNode.frequencyBinCount) {
    dataArray.current = new Uint8Array(analyserNode.frequencyBinCount);
  }

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector3(size.width, size.height, 1) },
    uStarSpeed: { value: 0.1 },
    uDensity: { value: 0.8 }, // Uszczuplone (mniej zagęszczone)
    uSpeed: { value: 0.3 }, // Wolniejsze, bardziej chillowe
    uAudioReact: { value: 0.0 },
  }), []);

  useFrame((state) => {
    if (!materialRef.current) return;

    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;

    // Early return: brak audio = nie czytuj frequency data
    if (!analyserNode || dataArray.current.length === 0) {
      materialRef.current.uniforms.uAudioReact.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uAudioReact.value,
        0,
        0.1
      );
      return;
    }

    analyserNode.getByteFrequencyData(dataArray.current);
    // Average the bass frequencies (first 10 bins)
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += dataArray.current[i];
    }
    const avgBass = sum / 10.0;
    // Normalize 0-1 and apply a threshold/curve
    const audioReact = Math.max(0, (avgBass / 255.0) - 0.4) * 2.0;

    // Smoothly interpolate the uniform value
    materialRef.current.uniforms.uAudioReact.value = THREE.MathUtils.lerp(
      materialRef.current.uniforms.uAudioReact.value,
      audioReact,
      0.1
    );
  });

  return (
    <shaderMaterial
      ref={materialRef}
      vertexShader={vertexShader}
      fragmentShader={fragmentShader}
      uniforms={uniforms}
      side={THREE.DoubleSide}
      depthWrite={false}
      transparent={false}
      toneMapped={false}
    />
  );
}
