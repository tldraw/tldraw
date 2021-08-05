'use strict';

var test = require('tap').test;
var path = require('path');
var threadId = require('../thread-id');

var Worker;
try {
  Worker = require('worker_threads').Worker;
} catch (e) {}

test('the main process has thread -1', function(t) {
  t.equal(threadId, -1);
  t.end();
});

if (Worker != null) {
  test('workers have positive integer threadIds', function(t) {
    t.plan(2);

    var w1 = new Worker(
      path.join(__dirname, '../fixtures/thread-id-test-worker.js'),
    );
    w1.once('message', function(message) {
      t.equal(message, 1);
    });
    var w2 = new Worker(
      path.join(__dirname, '../fixtures/thread-id-test-worker.js'),
    );
    w2.once('message', function(message) {
      t.equal(message, 2);
    });
  });
}
