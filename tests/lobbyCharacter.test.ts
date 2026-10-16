import test from 'node:test';
import assert from 'node:assert/strict';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { LOBBY_PAINT, CHARACTER_UV } from '../src/3d/world/hub/lobbyCharacterLayout.ts';

// Furniture placement moved to tests/lobbyFurniture.test.ts with the reception and lounge.

test('shared paint atlas keeps mobile memory and download bounded', async () => {
  for(const [profile,pixels,bytes] of [['shared',1024,120_000],['low',512,60_000]] as const) {
    const file=path.resolve(import.meta.dirname,'../public/textures/runtime/lobby',profile,'character.webp');
    const [info,size]=await Promise.all([sharp(file).metadata(),stat(file)]);
    assert.equal(info.width,pixels);assert.equal(info.height,pixels);
    assert.equal(info.hasAlpha,true);assert.ok(size.size<bytes);
  }
});

test('paint geometry has a small triangle count and padded UV regions inside the atlas', () => {
  assert.ok(LOBBY_PAINT.length*2<=16,'static paint must fit one small merged batch');
  for(const plane of LOBBY_PAINT) {
    const [x,y,w,h]=CHARACTER_UV[plane.tile];
    assert.ok(x>=0 && y>=0 && x+w<=1 && y+h<=1);
    assert.ok(w>16/1024 && h>16/1024);
  }
});
