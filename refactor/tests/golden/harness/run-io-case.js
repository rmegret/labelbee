// Runs one slice 3 case: call the function, let promises and timers settle, return the pinned observation.
'use strict';
const { ser } = require('./serialize');
const { readState } = require('./io-env');
const { withUnhandledRejections } = require('./unhandled');

async function runIoCase(makeEnv, c) {
  const { ctx, rec } = makeEnv(c);
  const args = c.args();
  const out = {};
  // Promise rejections nobody handles (an apply stage that throws inside a loader pipeline), recorded by name
  await withUnhandledRejections((e) => rec.rejections.push(e && e.name), async () => {
    try {
      const r = ctx[c.fn](...args);
      if (c.pinReturn) out.returned = ser(r);
    } catch (e) {
      out.threw = e && e.name;
    }
    await new Promise((resolve) => setImmediate(resolve)); // drains the promise chains of the stubs
  });
  out.state = readState(ctx);
  out.fx = rec.fx;
  out.cbErrors = rec.cbErrors;
  out.rejections = rec.rejections;
  out.alerts = rec.alerts;
  out.logs = rec.logs;
  out.errors = rec.errors;
  out.argsAfter = ser(args);
  return out;
}

module.exports = { runIoCase };
