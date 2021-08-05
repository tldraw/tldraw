'use strict';

require('worker_threads').parentPort.postMessage(require('../thread-id'));
