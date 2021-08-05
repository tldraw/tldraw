'use strict';

var threadId;
try {
  var Worker = require('worker_threads');
  if (Worker.isMainThread) {
    threadId = -1;
  } else {
    threadId = Worker.threadId;
  }
} catch (e) {
  // no worker support
  threadId = -1;
}

module.exports = threadId;
