// chrono/VideoCacheStatus.js (ADR 0012): cache content -> cachedFrames -> cachedFramesRuns (pure, no DOM).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

const JS_DIR = path.resolve(__dirname, '../../../../labelbee/static/labelbee/js');
const load = () => import(pathToFileURL(path.join(JS_DIR, 'chrono/VideoCacheStatus.js')).href);

// Minimal LRUCache stand-in: forEach(fn(key, value)) oldest first
const lru = (entries) => ({ forEach: (fn) => entries.forEach(([k, v]) => fn(k, v)) });

test('collectCachedFrames keeps only loaded/pending frames of the url, shifted by the offset, sorted', async () => {
  const { collectCachedFrames } = await load();
  const c = lru([
    ['a.mp4:12', { state: 'incache' }],
    ['a.mp4:10', { state: 'inqueue' }],
    ['a.mp4:11', { state: 'incache' }],
    ['a.mp4:13', { state: 'other' }],     // any other state: left out
    ['a.mp4:14', null],
    ['b.mp4:11', { state: 'incache' }],   // other video
  ]);
  assert.deepEqual(collectCachedFrames(c, 'a.mp4', 2), [
    { frame: 8, status: 'pending' },
    { frame: 9, status: 'loaded' },
    { frame: 10, status: 'loaded' },
  ]);
});

test('toRuns merges consecutive frames of the same status; a run can be one frame', async () => {
  const { toRuns } = await load();
  const f = (frame, status) => ({ frame, status });
  assert.deepEqual(toRuns([f(1, 'loaded'), f(2, 'loaded'), f(3, 'pending'), f(4, 'pending'), f(5, 'loaded'),
                           f(7, 'loaded'), f(9, 'pending')]), [
    { startFrame: 1, endFrame: 2, status: 'loaded' },
    { startFrame: 3, endFrame: 4, status: 'pending' },
    { startFrame: 5, endFrame: 5, status: 'loaded' },
    { startFrame: 7, endFrame: 7, status: 'loaded' },
    { startFrame: 9, endFrame: 9, status: 'pending' },
  ]);
  assert.deepEqual(toRuns([]), []);
});
