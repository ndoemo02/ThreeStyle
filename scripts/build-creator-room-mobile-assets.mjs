import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, draco, flatten, join, prune, simplify, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'public/models/creator-room/mobile');
await fs.mkdir(output, { recursive: true });
await Promise.all([MeshoptDecoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'draco3d.encoder': await draco3d.createEncoderModule(),
  'meshopt.decoder': MeshoptDecoder,
});
const models = [
  { name: 'ipad_pro_2024', ratio: 0.15, error: 0.005 },
  { name: 'mic-transformed', ratio: 0.1, error: 0.005 },
  { name: 'organizer', ratio: 0.25, error: 0.005 },
];

function stats(document) {
  const r = document.getRoot();
  let triangles = 0, primitives = 0;
  for (const mesh of r.listMeshes()) for (const primitive of mesh.listPrimitives()) {
    primitives++;
    if (primitive.getMode() === 4) triangles += (primitive.getIndices() || primitive.getAttribute('POSITION')).getCount() / 3;
  }
  return { triangles, primitives, materials: r.listMaterials().length, textures: r.listTextures().length };
}

const report = [];
for (const { name, ratio, error } of models) {
  const source = path.join(root, 'public/models/optimized', `${name}.glb`);
  const destination = path.join(output, `${name}.glb`);
  const document = await io.read(source);
  const before = stats(document);
  // Tiny props do not need a scene-wide transmission pass. Originals are untouched.
  for (const material of document.getRoot().listMaterials()) {
    const transmission = material.getExtension('KHR_materials_transmission');
    if (transmission?.getTransmissionFactor() > 0) {
      const color = material.getBaseColorFactor();
      material.setBaseColorFactor([color[0], color[1], color[2], 0.24]);
      material.setAlphaMode('BLEND');
      material.setRoughnessFactor(Math.max(0.25, material.getRoughnessFactor()));
    }
    material.getExtension('KHR_materials_transmission')?.dispose();
    material.getExtension('KHR_materials_volume')?.dispose();
  }
  await document.transform(
    dedup(), flatten(), join(), weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio, error }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [512, 512], quality: 82 }),
    textureCompress({ encoder: sharp, resize: [256, 256], slots: /normalTexture|metallicRoughnessTexture|occlusionTexture/, quality: 90 }),
    dedup(), prune(), draco({ encodeSpeed: 5, decodeSpeed: 5, quantizePosition: 14 }),
  );
  await io.write(destination, document);
  const after = stats(document);
  report.push({ name, before, after, bytes: (await fs.stat(destination)).size });
  console.log(`${name}: ${before.triangles} -> ${after.triangles} triangles; ${before.primitives} -> ${after.primitives} primitives`);
}
await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify(report, null, 2) + '\n');

// Small parameter maps reduce GPU memory; room colour/normal maps keep their detail.
const textureOutput = path.join(root, 'public/textures/runtime/creator-room/mobile');
for (const family of ['acoustic', 'diamond', 'bricks']) {
  for (const map of ['roughness', ...(family !== 'bricks' ? ['metalness'] : ['ao'])]) {
    const destination = path.join(textureOutput, family, `${map}.webp`);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await sharp(path.join(root, 'public/textures/runtime', family, `${map}.webp`))
      .resize(256, 256).webp({ quality: 88 }).toFile(destination);
  }
}
await fs.mkdir(path.join(textureOutput, 'vocal'), { recursive: true });
for (const map of ['wood', 'felt']) {
  await sharp(path.join(root, 'public/textures/vocal', `${map}.jpg`))
    .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 }).toFile(path.join(textureOutput, 'vocal', `${map}.webp`));
}
