import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectSessionFile, MAX_SESSION_FILE_BYTES, mergeCreatorLibrary, formatMediaTime } from '../src/lib/creatorMedia.ts';

test('mobile file pickers with an empty MIME type still accept supported extensions', () => {
  assert.equal(inspectSessionFile({ name: 'MY BEAT.WAV', type: '', size: 4096 }).kind, 'audio');
  assert.equal(inspectSessionFile({ name: 'clip.mp4', type: '', size: 4096 }).kind, 'video');
});
test('empty, oversized and non-media files are rejected without creating a session asset', () => {
  for (const file of [
    { name: 'empty.mp3', type: 'audio/mpeg', size: 0 },
    { name: 'huge.mp4', type: 'video/mp4', size: MAX_SESSION_FILE_BYTES + 1 },
    { name: 'document.pdf', type: 'application/pdf', size: 1024 },
  ]) assert.ok(inspectSessionFile(file).error);
  assert.equal(inspectSessionFile({ name: 'limit.mp4', type: 'video/mp4', size: MAX_SESSION_FILE_BYTES }).kind, 'video');
});
test('refreshing or losing the server catalog preserves local session files', () => {
  const local = { id: 'session:1', kind: 'audio' as const, title: 'My beat', src: 'blob:local', size: 1024, local: true };
  const remote = { id: 'audio:demo', kind: 'audio' as const, title: 'Demo', src: '/media/demo.mp3', size: 2048 };
  assert.deepEqual(mergeCreatorLibrary([remote], [local]), [local, remote]);
  assert.deepEqual(mergeCreatorLibrary([], [local]), [local]);
});
test('unknown duration never displays NaN or Infinity', () => {
  for (const seconds of [NaN, Infinity, -1]) assert.equal(formatMediaTime(seconds), '0:00');
  assert.equal(formatMediaTime(125.8), '2:05');
});
