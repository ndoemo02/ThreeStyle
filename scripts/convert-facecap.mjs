/**
 * Convert facecap.glb from KTX2/meshopt to plain PNG/standard geometry.
 * Uses three-stdlib GLTFLoader + KTX2Loader + MeshoptDecoder in Node.js
 * to parse the model, then re-exports it as a clean .glb.
 * 
 * Strategy: parse the binary GLB format manually, extract the JSON and BIN chunks,
 * use three.js GLTFLoader to parse it, then re-serialize with @gltf-transform.
 */

import { NodeIO } from '@gltf-transform/core';
import { allExtensions } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshopt-decoder';
import fs from 'fs';

// We need to read the GLB, decompress meshopt, then strip KTX2
// The cleanest approach: use gltf-transform CLI's meshopt command first,
// then handle KTX2.

// Actually, let's try a different approach entirely:
// Use the browser-oriented three.js loader in a minimal way.

// SIMPLEST APPROACH: Read the GLB binary, parse the JSON chunk,
// find texture references, and rewrite the GLB with PNG placeholders.

async function main() {
  await MeshoptDecoder.ready;
  console.log('MeshoptDecoder ready');

  const io = new NodeIO()
    .registerExtensions(allExtensions)
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

  console.log('Reading facecap.glb ...');
  const doc = await io.read('public/models/facecap.glb');
  const root = doc.getRoot();
  
  console.log('Extensions:', root.listExtensionsUsed().map(e => e.extensionName));
  console.log('Required:', root.listExtensionsRequired().map(e => e.extensionName));

  // Create a clean IO that doesn't require KTX2 or meshopt
  // First, let's transform: dequantize + unwrap to remove meshopt
  const { dequantize, dedup, textureResize } = await import('@gltf-transform/functions');
  
  console.log('Dequantizing ...');
  await doc.transform(dequantize());

  // Now manually handle KTX2 textures
  // The KTX2 data is embedded in the GLB bin chunk
  // We need to decode it — let's try writing with extensions but forcing PNG output
  
  const textures = root.listTextures();
  console.log('Textures:', textures.length);
  
  for (const tex of textures) {
    console.log(`  "${tex.getName()}" mime=${tex.getMimeType()} size=${tex.getImage()?.length || 0}`);
  }

  // Remove the KTX2 extension from required list by removing it from the document
  // This only works if we convert the texture data first
  
  // Strategy: since we can't easily decompress KTX2 in Node (no ktx CLI),
  // let's register the KTX2 extension for writing but NOT mark it required
  // Then the output file won't require KTX2Loader
  
  // Actually the issue is simpler than I thought:
  // The facecap.glb textures are KTX2 compressed. We can't decompress them without `ktx` CLI.
  // So instead: keep the ORIGINAL facecap.glb (which already works with KTX2Loader)
  // and just make sure KTX2Loader is properly configured in the app.
  
  console.log('\\nCannot decompress KTX2 without ktx CLI tool.');
  console.log('Alternative: configure KTX2Loader globally in the app.');
  process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
