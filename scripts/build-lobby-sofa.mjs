import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { meshopt, prune } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import { LOUNGE_BASE_TOP, LOUNGE_ISLANDS, LOUNGE_MODULE_GAP } from '../src/3d/world/hub/lobbyFurnitureLayout.ts';

// Lobby sofa module (own work): Blender builds and bakes it, this checks and compresses it.
// Run: node --experimental-strip-types scripts/build-lobby-sofa.mjs [path to blender.exe]
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const blender = process.argv[2] ?? 'C:/Program Files/Blender Foundation/Blender 4.3/blender.exe';
const work = path.join(root, 'assets/source/blender');
const raw = path.join(work, 'lobby_sofa_module_raw.glb');
const output = path.join(root, 'public/models/lobby/sofa_module.glb');

const [first, ...rest] = LOUNGE_ISLANDS;
const step = ({ arcLength, segments }) => arcLength / segments;
for (const island of rest) {
  for (const key of ['innerRadius', 'seatDepth', 'backDepth']) {
    if (Math.abs(island[key] - first[key]) > 1e-9) throw new Error(`islands differ in ${key}: one module cannot serve both`);
  }
  if (Math.abs(step(island) - step(first)) > 1e-9) throw new Error('islands differ in module angle');
}
const config = {
  innerRadius: first.innerRadius, seatDepth: first.seatDepth, backDepth: first.backDepth,
  moduleAngle: step(first) - LOUNGE_MODULE_GAP, moduleGap: LOUNGE_MODULE_GAP, baseTop: LOUNGE_BASE_TOP,
  glb: raw, blend: path.join(work, 'lobby_sofa_module.blend'),
};

await fs.mkdir(work, { recursive: true });
const run = spawnSync(blender, ['-b', '--factory-startup', '-P', path.join(root, 'scripts/blender/lobby_sofa_module.py'), '--', JSON.stringify(config)], { encoding: 'utf8' });
if (!run.stdout.includes('LOBBY_SOFA_OK')) {
  console.error(run.stdout.slice(-3000), run.stderr.slice(-3000));
  throw new Error('Blender did not finish the sofa module');
}

await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const document = await io.read(raw);

// The module must stay inside its sector, so the island colliders keep covering it.
const outer = config.innerRadius + config.seatDepth + config.backDepth;
let triangles = 0;
let minY = Infinity;
let maxRadius = 0;
let minRadius = Infinity;
let maxAngle = 0;
for (const mesh of document.getRoot().listMeshes()) {
  for (const primitive of mesh.listPrimitives()) {
    if (!primitive.getAttribute('COLOR_0')) throw new Error(`${mesh.getName()} has no baked AO (COLOR_0)`);
    const position = primitive.getAttribute('POSITION');
    triangles += (primitive.getIndices()?.getCount() ?? position.getCount()) / 3;
    const p = [0, 0, 0];
    for (let i = 0; i < position.getCount(); i++) {
      position.getElement(i, p);
      const radius = Math.hypot(p[0], p[2]);
      minY = Math.min(minY, p[1]);
      minRadius = Math.min(minRadius, radius);
      maxRadius = Math.max(maxRadius, radius);
      maxAngle = Math.max(maxAngle, Math.abs(Math.atan2(p[2], p[0])));
    }
  }
}
const eps = 0.01;
if (minY < config.baseTop - eps) throw new Error(`module dips to y=${minY.toFixed(3)} below the base`);
if (minRadius < config.innerRadius - eps || maxRadius > outer + eps) throw new Error(`radius ${minRadius.toFixed(3)}…${maxRadius.toFixed(3)} leaves the sector`);
if (maxAngle > config.moduleAngle / 2 + eps) throw new Error(`module spans ±${maxAngle.toFixed(3)} rad, more than its slot`);

await document.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(output, document);
const { size } = await fs.stat(output);
console.log(`Lobby sofa module: ${Math.round(triangles)} triangles, radius ${minRadius.toFixed(2)}…${maxRadius.toFixed(2)}, ±${maxAngle.toFixed(3)} rad, ${(size / 1024).toFixed(0)} kB -> ${path.relative(root, output)}`);
