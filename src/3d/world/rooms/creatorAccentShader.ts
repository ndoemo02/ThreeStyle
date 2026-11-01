import * as THREE from 'three';
import { BRICK_WASH, DOWNLIGHT_POOL_RADIUS, DOWNLIGHTS, ELEVATOR_FRAME, FLOOR_GLOW_REACH, FLOOR_LED_EDGES, FRAME_HALO_REACH, RUG } from './creatorAccentLayout';

/**
 * Accent light baked into the surface shaders: albedo × LED colour × falloff, added as emission.
 * It keeps the brick and carpet texture (an additive plane would not) and costs a few ALU ops
 * instead of a transparent full-screen layer. Shared uniform objects, updated once per frame by
 * CreatorAccentLights. Coordinates are world space; the Creator Room is mounted at the origin.
 */
export const CREATOR_ACCENT_UNIFORMS = {
  uAccentColor: { value: new THREE.Color('#ff9f45') },
  uAccentStrength: { value: 0 },
  /** Downlight pools: room light colour and level (the room channel). */
  uPoolColor: { value: new THREE.Color('#ffe8cf') },
  uPoolStrength: { value: 0 },
};

const glsl = (n: number) => (Number.isInteger(n) ? n.toFixed(1) : String(n));
const vec2 = ([x, y]: [number, number]) => `vec2(${glsl(x)}, ${glsl(y)})`;

const VERTEX_HEAD = 'varying vec3 vAccentWorld;\nvarying vec3 vAccentNormal;\n';
const VERTEX_BODY = 'vAccentWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvAccentNormal = normalize(mat3(modelMatrix) * objectNormal);\n';

const FLOOR_FUNCTION = `
float creatorAccentGlow(vec3 p, vec3 n) {
  if (n.y < 0.5) return 0.0;
  float glow = 0.0;
${FLOOR_LED_EDGES.map(({ from, to, outward }) => `  {
    vec2 a = ${vec2(from)}; vec2 ab = ${vec2([to[0] - from[0], to[1] - from[1]])};
    vec2 q = a + ab * clamp(dot(p.xz - a, ab) / dot(ab, ab), 0.0, 1.0);
    float side = dot(p.xz - q, ${vec2(outward)});
    float reach = max(0.0, 1.0 - length(p.xz - q) / ${glsl(FLOOR_GLOW_REACH)});
    glow += side > -0.04 ? reach * reach * reach : 0.0;
  }`).join('\n')}
  return min(glow, 1.4) * 4.0;
}
float creatorPoolGlow(vec3 p) {
  float pool = 0.0;
${DOWNLIGHTS.map(([x, z]) => `  { float r = max(0.0, 1.0 - length(p.xz - ${vec2([x, z])}) / ${glsl(DOWNLIGHT_POOL_RADIUS)}); pool += r * r; }`).join('\n')}
  return pool;
}`;

const BRICK_FUNCTION = `
float creatorAccentGlow(vec3 p, vec3 n) {
  if (n.z > -0.5) return 0.0;
  float wash = clamp(1.0 - (${glsl(BRICK_WASH.top)} - p.y) / ${glsl(BRICK_WASH.depth)}, 0.0, 1.0);
  vec2 outside = max(vec2(abs(p.x) - ${glsl(ELEVATOR_FRAME.halfWidth)}, p.y - ${glsl(ELEVATOR_FRAME.height)}), 0.0);
  float halo = max(0.0, 1.0 - length(outside) / ${glsl(FRAME_HALO_REACH)});
  return wash * wash * 3.6 + halo * halo * 4.0;
}`;

const NOISE = `
float creatorHash(vec2 c) { return fract(sin(dot(c, vec2(127.1, 311.7))) * 43758.5453); }
float creatorNoise(vec2 x) {
  vec2 i = floor(x), f = fract(x); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(creatorHash(i), creatorHash(i + vec2(1.0, 0.0)), u.x), mix(creatorHash(i + vec2(0.0, 1.0)), creatorHash(i + vec2(1.0, 1.0)), u.x), u.y);
}`;

/** Dark slate tiles (1 m) with per-tile tone, soft mottling and anti-aliased grout. Linear colour. */
const STONE_SURFACE = `
  vec2 tileUv = vAccentWorld.xz + vec2(0.5, 0.0);
  vec2 tileCell = floor(tileUv); vec2 tileF = fract(tileUv);
  float tileTone = creatorHash(tileCell);
  float mottle = creatorNoise(vAccentWorld.xz * 2.3 + tileTone * 17.0) * 0.6 + creatorNoise(vAccentWorld.xz * 9.0) * 0.4;
  vec2 toEdge = min(tileF, 1.0 - tileF);
  float aa = max(fwidth(tileUv.x), fwidth(tileUv.y)) * 1.5;
  float grout = 1.0 - smoothstep(0.004, 0.004 + aa, min(toEdge.x, toEdge.y));
  vec3 slate = vec3(0.026, 0.024, 0.023) * (0.75 + 0.4 * tileTone) * (0.75 + 0.5 * mottle);
  diffuseColor.rgb = mix(slate, vec3(0.008, 0.007, 0.007), grout * 0.85);
  creatorRoughness = mix(0.28 + 0.24 * mottle, 0.9, grout);`;

/** Burgundy wool rug: cloudy two-tone pattern, fine pile and a darker inset border. Linear colour. */
const RUG_SURFACE = `
  vec2 rugP = vAccentWorld.xz;
  vec2 rugEdge = min(rugP - vec2(${glsl(RUG.minX)}, ${glsl(RUG.minZ)}), vec2(${glsl(RUG.maxX)}, ${glsl(RUG.maxZ)}) - rugP);
  float rugD = min(rugEdge.x, rugEdge.y);
  float cloud = creatorNoise(rugP * 1.1) * 0.65 + creatorNoise(rugP * 3.7) * 0.35;
  float pile = creatorNoise(rugP * 70.0);
  float weave = creatorNoise(rugP * vec2(16.0, 22.0));
  float pileFade = 1.0 - smoothstep(0.004, 0.02, max(fwidth(rugP.x), fwidth(rugP.y)));
  float weaveFade = 1.0 - smoothstep(0.02, 0.07, max(fwidth(rugP.x), fwidth(rugP.y)));
  vec3 wool = mix(vec3(0.034, 0.006, 0.007), vec3(0.11, 0.018, 0.016), smoothstep(0.25, 0.8, cloud));
  wool *= (0.86 + 0.28 * pile * pileFade + 0.14 * (1.0 - pileFade)) * (0.82 + 0.36 * mix(0.5, weave, weaveFade));
  float border = smoothstep(0.14, 0.16, rugD) - smoothstep(0.24, 0.26, rugD);
  diffuseColor.rgb = mix(wool, vec3(0.018, 0.005, 0.005), border * 0.85);
  diffuseColor.rgb *= mix(0.7, 1.0, smoothstep(0.0, 0.06, rugD));
  creatorRoughness = 0.96;`;

function inject(material: THREE.MeshStandardMaterial, key: string, glowFunction: string, surface = '', pools = false) {
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, CREATOR_ACCENT_UNIFORMS);
    shader.vertexShader = VERTEX_HEAD + shader.vertexShader.replace('#include <worldpos_vertex>', `#include <worldpos_vertex>\n${VERTEX_BODY}`);
    const poolLight = pools ? '\ntotalEmissiveRadiance += diffuseColor.rgb * uPoolColor * (uPoolStrength * creatorPoolGlow(vAccentWorld));' : '';
    let fragment = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uAccentColor * (uAccentStrength * creatorAccentGlow(vAccentWorld, normalize(vAccentNormal)));${poolLight}`,
    );
    // Procedural surfaces replace the albedo and roughness before lighting.
    if (surface) fragment = fragment
      .replace('#include <color_fragment>', `#include <color_fragment>\nfloat creatorRoughness = roughness;${surface}`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = creatorRoughness;');
    shader.fragmentShader = `${VERTEX_HEAD}uniform vec3 uAccentColor;\nuniform float uAccentStrength;\nuniform vec3 uPoolColor;\nuniform float uPoolStrength;\n${NOISE}\n${glowFunction}\n${fragment}`;
  };
  material.customProgramCacheKey = () => key;
}

/** Procedural slate floor lit by the sofa/cabinet LEDs and the downlight pools. */
export const withStoneFloor = (material: THREE.MeshStandardMaterial) => inject(material, 'creator-stone-floor', FLOOR_FUNCTION, STONE_SURFACE, true);
/** Procedural burgundy rug, same accent and pool light as the floor. */
export const withRug = (material: THREE.MeshStandardMaterial) => inject(material, 'creator-rug', FLOOR_FUNCTION, RUG_SURFACE, true);
/** Brick front wall: cove wash and the elevator frame halo (room-facing faces only). */
export const withBrickAccents = (material: THREE.MeshStandardMaterial) => inject(material, 'creator-brick-accent', BRICK_FUNCTION);
