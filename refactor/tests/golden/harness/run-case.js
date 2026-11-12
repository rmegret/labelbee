// Runs one fixture case against an implementation factory and returns the pinned observation:
// return value (or thrown error name), inputs after the call (mutations), alerts, error-path logs, SQL.
'use strict';
const { ser } = require('./serialize');

function runCase(makeImpl, c) {
  const { fns, rec } = makeImpl();
  const args = c.args(rec);
  const out = {};
  try {
    out.returned = ser(fns[c.fn](...args));
  } catch (e) {
    out.threw = e && e.name;
  }
  out.argsAfter = ser(args);
  out.alerts = rec.alerts;
  out.logs = rec.logs;
  out.errors = rec.errors;
  out.sql = rec.sql;
  return out;
}

module.exports = { runCase };
