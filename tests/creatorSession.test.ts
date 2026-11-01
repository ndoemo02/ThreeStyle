import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCreatorSession, nextCreatorSessionState, stepCreatorSession, type CreatorSessionInput, type CreatorSessionState } from '../src/lib/creatorSession.ts';
import type { PlaybackStatus } from '../src/lib/creatorMedia.ts';

const STATES: CreatorSessionState[] = ['idle', 'ready', 'live', 'paused', 'ended'];
const input = (playback: PlaybackStatus, rest: Partial<CreatorSessionInput> = {}): CreatorSessionInput =>
  ({ playback, audible: playback === 'playing', inRoom: true, ended: false, ...rest });

test('the library auto-select is ready, not paused; play goes live in one step', () => {
  assert.equal(nextCreatorSessionState('idle', input('paused')), 'ready');
  assert.equal(nextCreatorSessionState('idle', input('loading')), 'ready');
  assert.equal(nextCreatorSessionState('ready', input('loading')), 'ready');
  assert.equal(nextCreatorSessionState('ready', input('playing')), 'live');
  assert.equal(nextCreatorSessionState('idle', input('playing')), 'live', 'entering the room mid-song');
});

test('playing before the audio runs is not live yet', () => {
  assert.equal(nextCreatorSessionState('ready', input('playing', { audible: false })), 'ready');
  assert.equal(nextCreatorSessionState('idle', input('playing', { audible: false })), 'ready');
});

test('buffering holds the state; pause and resume move between live and paused', () => {
  assert.equal(nextCreatorSessionState('live', input('loading')), 'live');
  assert.equal(nextCreatorSessionState('live', input('playing', { audible: false })), 'live');
  assert.equal(nextCreatorSessionState('live', input('paused')), 'paused');
  assert.equal(nextCreatorSessionState('paused', input('paused')), 'paused');
  assert.equal(nextCreatorSessionState('paused', input('loading')), 'paused');
  assert.equal(nextCreatorSessionState('paused', input('playing')), 'live');
});

test('the end is reached from live and from paused; replay or a new track leaves it', () => {
  assert.equal(nextCreatorSessionState('live', input('paused', { ended: true })), 'ended');
  assert.equal(nextCreatorSessionState('paused', input('paused', { ended: true })), 'ended');
  assert.equal(nextCreatorSessionState('ended', input('loading', { ended: true })), 'ended');
  assert.equal(nextCreatorSessionState('ended', input('playing')), 'live');
  assert.equal(nextCreatorSessionState('ended', input('paused')), 'ready', 'a newly selected track');
});

test('an unplayable track is ready; no track or leaving the room is idle from every state', () => {
  for (const state of STATES) {
    assert.equal(nextCreatorSessionState(state, input('error')), 'ready');
    assert.equal(nextCreatorSessionState(state, input('idle')), 'idle');
    for (const playback of ['loading', 'playing', 'paused', 'error'] as const) {
      assert.equal(nextCreatorSessionState(state, input(playback, { inRoom: false })), 'idle', `${state} + ${playback} outside`);
    }
  }
});

test('garbage input keeps the state, a garbage state starts from idle', () => {
  for (const state of STATES) assert.equal(nextCreatorSessionState(state, input('stopped' as PlaybackStatus)), state);
  assert.equal(nextCreatorSessionState('broken' as CreatorSessionState, input('paused')), 'ready');
  assert.equal(nextCreatorSessionState('live', input('playing', { audible: 1 as unknown as boolean })), 'live');
  assert.equal(nextCreatorSessionState('ready', input('playing', { audible: 1 as unknown as boolean })), 'ready');
});

test('the change counter moves only on real changes', () => {
  const session = createCreatorSession();
  const steps: [PlaybackStatus, Partial<CreatorSessionInput>?][] = [
    ['paused'], ['paused'], ['loading'], ['playing'], ['loading'], ['playing'], ['paused'], ['playing'], ['playing', { inRoom: false }], ['playing'],
  ];
  const seen: CreatorSessionState[] = [];
  for (const [playback, rest] of steps) if (stepCreatorSession(session, input(playback, rest))) seen.push(session.state);
  assert.deepEqual(seen, ['ready', 'live', 'paused', 'live', 'idle', 'live']);
  assert.equal(session.changes, seen.length);
});
