import * as THREE from 'three';
import { BRICK_WASH, ELEVATOR_FRAME, FLOOR_GLOW_REACH, FLOOR_LED_EDGES, FRAME_HALO_REACH } from './creatorAccentLayout';

/**
 * Accent light baked into the surface shaders: albedo × LED colour × falloff, added as emission.
 * It keeps the brick and carpet texture (an additive plane would not) and costs a few ALU ops
 * instead of a transparent full-screen layer. Shared uniform objects, updated once per frame by
 * CreatorAccentLights. Coordinates are world space; the Creator Room is mounted at the origin.
 */
export const CREATOR_ACCENT_UNIFORMS = {
  uAccentColor: { value: new THREE.Color('#ff9f45') },
  uAccentStrength: { value: 0 },
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
}`;

const BRICK_FUNCTION = `
float creatorAccentGlow(vec3 p, vec3 n) {
  if (n.z > -0.5) return 0.0;
  float wash = clamp(1.0 - (${glsl(BRICK_WASH.top)} - p.y) / ${glsl(BRICK_WASH.depth)}, 0.0, 1.0);
  vec2 outside = max(vec2(abs(p.x) - ${glsl(ELEVATOR_FRAME.halfWidth)}, p.y - ${glsl(ELEVATOR_FRAME.height)}), 0.0);
  float halo = max(0.0, 1.0 - length(outside) / ${glsl(FRAME_HALO_REACH)});
  return wash * wash * 3.6 + halo * halo * 4.0;
}`;

function inject(material: THREE.MeshStandardMaterial, key: string, glowFunction: string) {
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, CREATOR_ACCENT_UNIFORMS);
    shader.vertexShader = VERTEX_HEAD + shader.vertexShader.replace('#include <worldpos_vertex>', `#include <worldpos_vertex>\n${VERTEX_BODY}`);
    shader.fragmentShader = `${VERTEX_HEAD}uniform vec3 uAccentColor;\nuniform float uAccentStrength;\n${glowFunction}\n` + shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uAccentColor * (uAccentStrength * creatorAccentGlow(vAccentWorld, normalize(vAccentNormal)));',
    );
  };
  material.customProgramCacheKey = () => key;
}

/** Floor in front of the sofa and cabinet LEDs. */
export const withFloorAccents = (material: THREE.MeshStandardMaterial) => inject(material, 'creator-floor-accent', FLOOR_FUNCTION);
/** Brick front wall: cove wash and the elevator frame halo (room-facing faces only). */
export const withBrickAccents = (material: THREE.MeshStandardMaterial) => inject(material, 'creator-brick-accent', BRICK_FUNCTION);
