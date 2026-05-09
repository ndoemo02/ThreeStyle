/**
 * Decompress facecap.glb: remove KTX2 (KHR_texture_basisu) and meshopt (EXT_meshopt_compression)
 * so Three.js can load it without KTX2Loader or MeshoptDecoder.
 */
import { NodeIO, WebIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS, KHRTextureBasisu, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { ktxdecompress } from '@gltf-transform/functions';
import pkg from 'meshopt-decoder';
const { MeshoptDecoder } = pkg;

const io = new NodeIO()
  .registerExtensions(KHRONOS_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

try {
  console.log('Reading facecap.glb ...');
  const doc = await io.read('public/models/facecap.glb');

  const root = doc.getRoot();
  console.log('Extensions used:', root.listExtensionsUsed().map(e => e.extensionName));

  // Decompress KTX2 textures to PNG
  console.log('Decompressing KTX2 textures ...');
  try {
    await doc.transform(ktxdecompress());
    console.log('KTX2 decompression done');
  } catch (e) {
    console.warn('ktxdecompress failed:', e.message);
    console.warn('Will try manual conversion instead ...');
  }

  // List textures after decompression attempt
  const textures = root.listTextures();
  for (const tex of textures) {
    console.log(`  Texture "${tex.getName()}": ${tex.getMimeType()}, ${tex.getImage()?.length || 0} bytes`);
  }

  // Remove extension requirements so Three.js doesn't need special loaders
  // The extensions will be removed automatically if no longer needed after decompression

  // Write output with only non-KTX2/non-meshopt extensions
  const io_out = new NodeIO()
    .registerExtensions(KHRONOS_EXTENSIONS.filter(E => {
      const name = new E().extensionName;
      return name !== 'KHR_texture_basisu' && name !== 'EXT_meshopt_compression';
    }));

  console.log('Writing optimized/facecap.glb ...');
  io_out.write('public/models/optimized/facecap.glb', doc);

  const fs = await import('fs');
  const stats = fs.statSync('public/models/optimized/facecap.glb');
  console.log(`Done! Output: ${(stats.size / 1024).toFixed(1)} KB`);
} catch (e) {
  console.error('Error:', e.message);
  console.error(e.stack);
  process.exit(1);
}
