'use strict';

var assert = require('assert');
var cluster = require('cluster');
var path = require('path');
var numCPUs = require('os').cpus().length;

var lmdb = require('..');
const MAX_DB_SIZE = 256 * 1024 * 1024;

if (cluster.isMaster) {

  // The master process

  var env = new lmdb.Env();
  env.open({
    path: path.resolve(__dirname, './testdata'),
    maxDbs: 10,
    mapSize: MAX_DB_SIZE,
    maxReaders: 126
  });

  var dbi = env.openDbi({
    name: 'cluster',
    create: true
  });

  var workerCount = Math.min(numCPUs * 2, 20);
  var value = Buffer.from('48656c6c6f2c20776f726c6421', 'hex');

  // This will start as many workers as there are CPUs available.
  var workers = [];
  for (var i = 0; i < workerCount; i++) {
    var worker = cluster.fork();
    workers.push(worker);
  }

  var messages = [];

  workers.forEach(function(worker) {
    worker.on('message', function(msg) {
      messages.push(msg);
      // Once every worker has replied with a response for the value
      // we can exit the test.
      if (messages.length === workerCount) {
        dbi.close();
        env.close();
        for (var i = 0; i < messages.length; i ++) {
          assert(messages[i] === value.toString('hex'));
        }
        process.exit(0);
      }
    });
  });

  var txn = env.beginTxn();
  for (var i = 0; i < workers.length; i++) {
    txn.putBinary(dbi, 'key' + i, value);
  }

  txn.commit();

  for (var i = 0; i < workers.length; i++) {
    var worker = workers[i];
    worker.send({key: 'key' + i});
  };

} else {

  // The worker process

  var env = new lmdb.Env();
  env.open({
    path: path.resolve(__dirname, './testdata'),
    maxDbs: 10,
    mapSize: MAX_DB_SIZE,
    maxReaders: 126,
    readOnly: true
  });

  var dbi = env.openDbi({
    name: 'cluster'
  });

  process.on('message', function(msg) {
    if (msg.key) {
      var txn = env.beginTxn({readOnly: true});
      var value = txn.getBinary(dbi, msg.key);
      
      if (value === null) {
        process.send("");
      } else {
        process.send(value.toString('hex'));
      }
      
      txn.abort();
    }
  });

}
