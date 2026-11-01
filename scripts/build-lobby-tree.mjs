import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, simplify, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

// Lobby tree from Poly Haven "Pachira Aquatica 01" (CC0, see public/models/lobby/ASSETS.md).
// The source holds four plants side by side; the lobby keeps the tallest one (variant d),
// moved to the origin, simplified, with WebP textures and meshopt geometry.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'assets/source/polyhaven/pachira_aquatica_01/pachira_aquatica_01_1k.gltf');
const output = path.join(root, 'public/models/lobby/pachira_aquatica_01.glb');
const KEEP = new Set(['pachira_aquatica_01_bark_d', 'pachira_aquatica_01_leaves_d']);
const RATIO = Number(process.argv[2] ?? 0.5);
const TEXTURE_SIZE = Number(process.argv[3] ?? 512);

await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const document = await io.read(source);
const scene = document.getRoot().getDefaultScene() ?? document.getRoot().listScenes()[0];

for (const node of document.getRoot().listNodes()) {
  if (!KEEP.has(node.getName())) { node.dispose(); continue; }
  node.setTranslation([0, 0, 0]);
  if (!scene.listChildren().includes(node)) scene.addChild(node);
}

await document.transform(
  prune(),
  dedup(),
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: RATIO, error: 0.002 }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [TEXTURE_SIZE, TEXTURE_SIZE], quality: 82 }),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  prune(),
);

const triangles = document.getRoot().listMeshes().reduce((sum, mesh) => sum + mesh.listPrimitives()
  .reduce((count, primitive) => count + (primitive.getIndices()?.getCount() ?? primitive.getAttribute('POSITION').getCount()) / 3, 0), 0);
await fs.mkdir(path.dirname(output), { recursive: true });
await io.write(output, document);
const { size } = await fs.stat(output);
console.log(`Lobby tree: ${Math.round(triangles)} triangles, textures ${TEXTURE_SIZE}², ${(size / 1024).toFixed(0)} kB -> ${path.relative(root, output)}`);
