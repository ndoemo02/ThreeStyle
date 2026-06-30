import { NodeIO } from '@gltf-transform/core';
import fs from 'fs';

const io = new NodeIO();
const checkGLTF = async (filePath) => {
  try {
    const document = await io.read(filePath);
    const root = document.getRoot();
    const textures = root.listTextures();
    console.log(`\nFile: ${filePath}`);
    textures.forEach((texture, i) => {
      console.log(`Texture ${i}: MIMEType = ${texture.getMimeType()}, URI = ${texture.getURI()}`);
    });
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
  }
};

const run = async () => {
  await checkGLTF('./public/models/new/stylized_tree.glb');
  await checkGLTF('./public/models/new/Nowy folder/refined_venetian_3-seater_sofa_bin.glb');
  await checkGLTF('./public/models/new/Nowy folder/zestaw kwiaty.glb');
  await checkGLTF('./public/models/new/Nowy folder/crimson_summit.glb');
};

run();
