import * as THREE from 'three';
import { LOBBY_DOWNLIGHTS } from './lobbyFurnitureLayout';
import { LOBBY_FLOOR_TILE, LOBBY_REFLECTION, LOBBY_WALL_LIGHT } from './lobbyLightLayout';

/**
 * Lobby surfaces in the Creator Room pattern: procedural albedo and light computed in the shader,
 * constants generated from the layout, no transparent layers. Hub world coordinates.
 */
const glsl = (n: number) => (Number.isInteger(n) ? n.toFixed(1) : String(n));

const VERTEX_HEAD = 'varying vec3 vLobbyWorld;\nvarying vec3 vLobbyNormal;\n';
const VERTEX_BODY = 'vLobbyWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvLobbyNormal = normalize(mat3(modelMatrix) * objectNormal);\n';
const WARM = 'vec3(1.0, 0.52, 0.22)';

const NOISE = `
float lobbyHash(vec2 c) { return fract(sin(dot(c, vec2(127.1, 311.7))) * 43758.5453); }
float lobbyNoise(vec2 x) {
  vec2 i = floor(x), f = fract(x); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(lobbyHash(i), lobbyHash(i + vec2(1.0, 0.0)), u.x), mix(lobbyHash(i + vec2(0.0, 1.0)), lobbyHash(i + vec2(1.0, 1.0)), u.x), u.y);
}`;

/**
 * Downlights mirrored in the floor: each light shows where the camera→mirror-image line meets the floor
 * (see mirroredLightOnFloor), stretched towards the viewer like a reflection on polished stone. The
 * spot never gets narrower than ~2 px, with its energy kept, so distant spots fade instead of sparkling.
 */
const REFLECTIONS = `
float lobbyReflections(vec3 p) {
  float k = cameraPosition.y / (cameraPosition.y + ${glsl(LOBBY_REFLECTION.height)});
  float px = max(fwidth(p.x), fwidth(p.z));
  float r = ${glsl(LOBBY_REFLECTION.radius)};
  float rr = max(r, px * 2.0);
  float energy = (r * r) / (rr * rr);
  float sum = 0.0;
${LOBBY_DOWNLIGHTS.map(({ position: [x, , z] }) => `  {
    vec2 hit = cameraPosition.xz + (vec2(${glsl(x)}, ${glsl(z)}) - cameraPosition.xz) * k;
    vec2 toward = cameraPosition.xz - hit; float len = length(toward);
    vec2 along = len > 0.001 ? toward / len : vec2(0.0, 1.0);
    vec2 d = p.xz - hit;
    float a = dot(d, along) / ${glsl(LOBBY_REFLECTION.stretch)}, b = dot(d, vec2(-along.y, along.x));
    float q = max(0.0, 1.0 - length(vec2(a, b)) / rr);
    sum += q * q;
  }`).join('\n')}
  return sum * energy;
}`;

/** Large greige tiles, per-tile tone, soft mottling, anti-aliased grout. Linear colour. */
const FLOOR_SURFACE = `
  vec2 tileUv = vLobbyWorld.xz / ${glsl(LOBBY_FLOOR_TILE)} + vec2(0.5, 0.5);
  vec2 tileCell = floor(tileUv); vec2 tileF = fract(tileUv);
  float tileTone = lobbyHash(tileCell);
  float mottle = lobbyNoise(vLobbyWorld.xz * 1.7 + tileTone * 13.0) * 0.6 + lobbyNoise(vLobbyWorld.xz * 7.0) * 0.4;
  vec2 toEdge = min(tileF, 1.0 - tileF);
  float aa = max(fwidth(tileUv.x), fwidth(tileUv.y)) * 1.5;
  float grout = 1.0 - smoothstep(0.003, 0.003 + aa, min(toEdge.x, toEdge.y));
  vec3 stone = vec3(0.024, 0.021, 0.019) * (0.8 + 0.35 * tileTone) * (0.8 + 0.4 * mottle);
  diffuseColor.rgb = mix(stone, vec3(0.006, 0.005, 0.005), grout * 0.55);
  float lobbyGrout = grout;
  lobbyRoughness = mix(0.4 + 0.14 * mottle, 0.9, grout);`;

const WALL_SURFACE = `
  float lobbyWall = abs(normalize(vLobbyNormal).y) < 0.5 ? 1.0 : 0.0;
  diffuseColor.rgb *= mix(1.0, mix(${glsl(LOBBY_WALL_LIGHT.floorShade)}, 1.0, smoothstep(0.0, ${glsl(LOBBY_WALL_LIGHT.shadeHeight)}, vLobbyWorld.y)), lobbyWall);
  lobbyRoughness = roughness;`;

const WALL_EMISSION = `
  float wash = clamp(1.0 - (${glsl(LOBBY_WALL_LIGHT.ceiling)} - vLobbyWorld.y) / ${glsl(LOBBY_WALL_LIGHT.washDepth)}, 0.0, 1.0);
  totalEmissiveRadiance += diffuseColor.rgb * ${WARM} * (wash * wash * ${glsl(LOBBY_WALL_LIGHT.washStrength)} * lobbyWall);`;

const FLOOR_EMISSION = `
#ifndef LOBBY_NO_REFLECTIONS
  totalEmissiveRadiance += ${WARM} * (lobbyReflections(vLobbyWorld) * ${glsl(LOBBY_REFLECTION.strength)} * (1.0 - lobbyGrout));
#endif`;

function inject(material: THREE.MeshStandardMaterial, key: string, surface: string, emission: string, functions = '') {
  material.onBeforeCompile = shader => {
    shader.vertexShader = VERTEX_HEAD + shader.vertexShader.replace('#include <worldpos_vertex>', `#include <worldpos_vertex>\n${VERTEX_BODY}`);
    shader.fragmentShader = `${VERTEX_HEAD}${NOISE}\n${functions}\n${shader.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>\nfloat lobbyRoughness;${surface}`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = lobbyRoughness;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>${emission}`)}`;
  };
  material.customProgramCacheKey = () => key;
}

/** Glossy tiled floor with mirrored downlights; `reflections: false` on the lowest mobile tier. */
export function withLobbyFloor(material: THREE.MeshStandardMaterial, reflections: boolean) {
  if (!reflections) material.defines = { ...material.defines, LOBBY_NO_REFLECTIONS: '' };
  inject(material, reflections ? 'lobby-floor' : 'lobby-floor-flat', FLOOR_SURFACE, FLOOR_EMISSION, REFLECTIONS);
  return material;
}

/** Plaster walls: darker low, warm cove wash under the ceiling. Horizontal faces are left alone. */
export function withLobbyWalls(material: THREE.MeshStandardMaterial) {
  inject(material, 'lobby-walls', WALL_SURFACE, WALL_EMISSION);
  return material;
}
