// Runs fn with the process 'unhandledRejection' event taken over: `onUnhandled(reason)` gets every rejection
// nobody handles. The node test runner fails a test on such an event, but in the slice 3 loaders it is
// pinned behavior (an apply stage that throws, a CSV request without catch, DEBT-722/725), so the runner's
// own listeners are removed while fn runs and put back afterwards.
'use strict';

async function withUnhandledRejections(onUnhandled, fn) {
  const saved = process.listeners('unhandledRejection');
  process.removeAllListeners('unhandledRejection');
  process.on('unhandledRejection', onUnhandled);
  try {
    return await fn();
  } finally {
    process.off('unhandledRejection', onUnhandled);
    for (const l of saved) process.on('unhandledRejection', l);
  }
}

module.exports = { withUnhandledRejections };
