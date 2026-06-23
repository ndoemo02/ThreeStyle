import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const textures = [
  ['public/textures/DiamondPlate/DiamondPlate006C_2K-JPG_Color.jpg', 'public/textures/runtime/diamond/color.webp', 74],
  ['public/textures/DiamondPlate/DiamondPlate006C_2K-JPG_NormalGL.jpg', 'public/textures/runtime/diamond/normal.webp', 84],
  ['public/textures/DiamondPlate/DiamondPlate006C_2K-JPG_Roughness.jpg', 'public/textures/runtime/diamond/roughness.webp', 68],
  ['public/textures/DiamondPlate/DiamondPlate006C_2K-JPG_Metalness.jpg', 'public/textures/runtime/diamond/metalness.webp', 68],
  ['public/textures/DiamondPlate/DiamondPlate006C_2K-JPG_AmbientOcclusion.jpg', 'public/textures/runtime/diamond/ao.webp', 68],
  ['public/textures/drewno/Bricks061_2K-JPG/Bricks061_2K-JPG_Color.jpg', 'public/textures/runtime/bricks/color.webp', 74],
  ['public/textures/drewno/Bricks061_2K-JPG/Bricks061_2K-JPG_AmbientOcclusion.jpg', 'public/textures/runtime/bricks/ao.webp', 68],
  ['public/textures/drewno/Bricks061_2K-JPG/Bricks061_2K-JPG_NormalGL.jpg', 'public/textures/runtime/bricks/normal.webp', 84],
  ['public/textures/drewno/Bricks061_2K-JPG/Bricks061_2K-JPG_Roughness.jpg', 'public/textures/runtime/bricks/roughness.webp', 68],
  ['public/textures/drewno/AcousticFoam002_2K-JPG/AcousticFoam002_2K-JPG_Color.jpg', 'public/textures/runtime/acoustic/color.webp', 74],
  ['public/textures/drewno/AcousticFoam002_2K-JPG/AcousticFoam002_2K-JPG_NormalGL.jpg', 'public/textures/runtime/acoustic/normal.webp', 84],
  ['public/textures/drewno/AcousticFoam002_2K-JPG/AcousticFoam002_2K-JPG_Roughness.jpg', 'public/textures/runtime/acoustic/roughness.webp', 68],
  ['public/textures/drewno/AcousticFoam002_2K-JPG/AcousticFoam002_2K-JPG_Metalness.jpg', 'public/textures/runtime/acoustic/metalness.webp', 68],
];

for (const [source, destination, quality] of textures) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const result = await sharp(source)
    .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality, effort: 5, smartSubsample: true })
    .toFile(destination);

  console.log(`${destination}: ${Math.round(result.size / 1024)} KB`);
}
