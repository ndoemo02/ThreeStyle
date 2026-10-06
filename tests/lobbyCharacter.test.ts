import test from 'node:test';
import assert from 'node:assert/strict';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { LOBBY_SEAT, LOBBY_SEAT_TRIM, LOBBY_SEAT_LED, LOBBY_PAINT, CHARACTER_UV } from '../src/3d/world/hub/lobbyCharacterLayout.ts';

test('all solid furnishings remain behind the original lobby wall, clear of the corridor mouth', () => {
  for(const box of [...LOBBY_SEAT,...LOBBY_SEAT_TRIM,...LOBBY_SEAT_LED]) {
    assert.ok(box.position[0]+box.size[0]/2 < -9.82,'furniture must not intrude on the walkable lobby footprint');
    assert.ok(box.position[2]-box.size[2]/2 >= -1,'clear the corridor entry at z=-5');
    assert.ok(box.position[2]+box.size[2]/2 <= 4.2,'stay within the seating recess');
  }
});

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
