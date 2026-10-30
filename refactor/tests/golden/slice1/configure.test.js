// configure() of AnnotationCodec requires hasLabel; Notifier defaults and setNotifier (ADR 0003).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

const JS_DIR = path.resolve(__dirname, '../../../../labelbee/static/labelbee/js');
const load = (rel) => import(pathToFileURL(path.join(JS_DIR, rel)).href);

test('configure throws unless hasLabel is a function', async () => {
  const codec = await load('annotation/AnnotationCodec.js');
  assert.throws(() => codec.configure({}), /hasLabel is required/);
  assert.throws(() => codec.configure({ hasLabel: 'x' }), /hasLabel is required/);
  codec.configure({ hasLabel: () => true });
});

test('Notifier: defaults, then setNotifier replaces a subset', async () => {
  const n = await load('core/Notifier.js');
  assert.equal(n.logIO(), false);
  const seen = [];
  const warn = console.warn;
  console.warn = (m) => seen.push(m); // default alert falls back to console.warn without a global alert
  try { n.alert('a1'); } finally { console.warn = warn; }
  assert.deepEqual(seen, ['a1']);

  const got = [];
  n.setNotifier({ alert: (m) => got.push('alert:' + m) });
  n.alert('a2');
  assert.deepEqual(got, ['alert:a2']);
  n.logging.io = true; // logIO reads the flag at call time
  assert.equal(n.logIO(), true);
});
