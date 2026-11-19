// chrono/VideoKeyframes.js (ADR 0014): packets.csv -> keyframes, nearest keyframe (pure, no DOM).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const REPO = path.resolve(__dirname, '../../../..');
const JS_DIR = path.join(REPO, 'labelbee/static/labelbee/js');
const load = () => import(pathToFileURL(path.join(JS_DIR, 'chrono/VideoKeyframes.js')).href);

test('parsePackets keeps the frames whose key_frame is 1, sorted, whatever the column order', async () => {
  const { parsePackets } = await load();
  assert.deepEqual(parsePackets('frame,key_frame,pts\n0,1,0\n1,0,512\n2,0,1024\n50,1,25600\n'), [0, 50]);
  assert.deepEqual(parsePackets('pts,key_frame,frame\r\n0,1,7\r\n1,0,8\r\n2,1,3\r\n'), [3, 7]);
});

test('parsePackets: no frame or key_frame column -> null, no keyframe -> empty', async () => {
  const { parsePackets } = await load();
  assert.equal(parsePackets('frame,pts\n0,0\n'), null);
  assert.equal(parsePackets(''), null);
  assert.deepEqual(parsePackets('frame,key_frame\n0,0\n1,0\n'), []);
});

test('parsePackets reads the packets.csv of the gurabo sample: keyframes 0, 50 and 100 (150 frames)', async () => {
  const { parsePackets } = await load();
  const csv = fs.readFileSync(path.join(REPO, 'tests/webapp/data/sample_gurabo/sample_gurabo.cfr.mp4.packets.csv'), 'utf8');
  assert.deepEqual(parsePackets(csv), [0, 50, 100]);
});

test('nearestKeyframe: nearest, earlier one on a tie, ends clamp, empty/null leave the frame', async () => {
  const { nearestKeyframe } = await load();
  const k = [0, 50, 100];
  assert.equal(nearestKeyframe(k, 0), 0);
  assert.equal(nearestKeyframe(k, 24), 0);
  assert.equal(nearestKeyframe(k, 25), 0);   // tie: earlier
  assert.equal(nearestKeyframe(k, 26), 50);
  assert.equal(nearestKeyframe(k, 50), 50);
  assert.equal(nearestKeyframe(k, 99), 100);
  assert.equal(nearestKeyframe(k, 130), 100); // after the last
  assert.equal(nearestKeyframe([10, 60], 3), 10); // before the first
  assert.equal(nearestKeyframe([], 7), 7);
  assert.equal(nearestKeyframe(null, 7), 7);
});

test('VideoKeyframes.load: ok, missing sidecar, and a late answer for another video is dropped', async () => {
  const { VideoKeyframes } = await load();
  const csv = 'frame,key_frame\n0,1\n1,0\n50,1\n';
  const answers = { 'a.mp4.packets.csv': csv, 'b.mp4.packets.csv': 'frame,key_frame\n5,1\n' };
  const resolvers = {};
  globalThis.fetch = (url) => new Promise((resolve) => {
    const name = url.split('/').pop();
    resolvers[name] = () => resolve(name in answers
      ? { ok: true, text: async () => answers[name] } : { ok: false });
  });
  const vk = new VideoKeyframes();
  const first = vk.load('a.mp4');                 // slow
  const second = vk.load('b.mp4');
  resolvers['b.mp4.packets.csv'](); await second;
  assert.deepEqual(vk.keyframes, [5]);
  resolvers['a.mp4.packets.csv'](); await first;  // late answer of the previous video
  assert.deepEqual(vk.keyframes, [5]);
  assert.equal(vk.isKeyframe(5), true); assert.equal(vk.isKeyframe(6), false);
  assert.equal(vk.nearest(40), 5);
  const third = vk.load('none.mp4'); resolvers['none.mp4.packets.csv']();
  assert.equal(await third, false);
  assert.equal(vk.keyframes, null); assert.equal(vk.available, false);
});
