'use strict';
const { Worker, isMainThread, parentPort, threadId } = require('worker_threads');
const { isMaster, fork } = require('cluster');

var crypto = require('crypto');
var path = require('path');
var testDirPath = path.resolve(__dirname, './benchdata');

var fs =require('fs');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');
var benchmark = require('benchmark');
var suite = new benchmark.Suite();

const { open, lmdbNativeFunctions } = require('..');
var env;
var dbi;
var keys = [];
var total = 100;
var store
let data = {
  name: 'test',
  greeting: 'Hello, World!',
  flag: true,
  littleNum: 3,
  biggerNum: 32254435,
  decimal:1.332232,
  bigDecimal: 3.5522E102,
  negative: -54,
  aNull: null,
  more: 'string',
}

var c = 0
let result

let iteration = 1
function setData(deferred) {
/*  result = store.transactionAsync(() => {
    for (let j = 0;j<100; j++)
      store.put((c += 357) % total, data)
  })*/
  let key = (c += 357) % total
  result = store.put(key, data)
  /*if (key % 2 == 0)
    result = store.put(key, data)
  else
    result = store.transactionAsync(() => store.put(key, data))*/
  if (iteration++ % 1000 == 0) {
      setImmediate(() => deferred.resolve(result))
  } else
    deferred.resolve()
}

function getData() {
  result = store.get((c += 357) % total)
}
function getBinary() {
  result = store.getBinary((c += 357) % total)
}
function getBinaryFast() {
  result = store.getBinaryFast((c += 357) % total)
}
function getRange() {
  let start = (c += 357) % total
  let i = 0
  for (let entry of store.getRange({
    start,
    end: start + 10
  })) {
    i++
  }
}
let jsonBuffer = JSON.stringify(data)
function plainJSON() {
  result = JSON.parse(jsonBuffer)
}

if (isMainThread && isMaster) {
var inspector = require('inspector')
//inspector.open(9330, null, true); debugger

function cleanup(done) {
  // cleanup previous test directory
  rimraf(testDirPath, function(err) {
    if (err) {
      return done(err);
    }
    // setup clean directory
    mkdirp(testDirPath).then(() => {
      done();
    }, error => done(error));
  });
}
function setup() {
  console.log('opening', testDirPath)
  let rootStore = open(testDirPath, {
    noMemInit: true,
    //winMemoryPriority: 4,
  })
  store = rootStore.openDB('testing', {
    create: true,
    sharedStructuresKey: 100000000,
    keyIsUint32: true,    
  })
  let lastPromise
  for (let i = 0; i < total; i++) {
    lastPromise = store.put(i, data)
  }
  return lastPromise.then(() => {
    console.log('setup completed');
  })
}
var txn;

cleanup(async function (err) {
    if (err) {
        throw err;
    }
    await setup();
    suite.add('getRange', getRange);
    suite.add('put', {
      defer: true,
      fn: setData
    });
    suite.add('get', getData);
    suite.add('plainJSON', plainJSON);
    suite.add('getBinary', getBinary);
    suite.add('getBinaryFast', getBinaryFast);
    suite.on('cycle', function (event) {
      console.log({result})
      if (result && result.then) {
        let start = Date.now()
        result.then(() => {
          console.log('last commit took ' + (Date.now() - start) + 'ms')
        })
      }
      console.log(String(event.target));
    });
    suite.on('complete', async function () {
        console.log('Fastest is ' + this.filter('fastest').map('name'));
        var numCPUs = require('os').cpus().length;
        console.log('Test opening/closing threads ' + numCPUs + ' threads');
        for (var i = 0; i < numCPUs; i++) {
          var worker = new Worker(__filename);
          await new Promise(r => setTimeout(r,30));
          worker.terminate();
          if ((i % 2) == 0)
            await new Promise(r => setTimeout(r,30));
          //var worker = fork();
        }
        console.log('Now will run benchmark across ' + numCPUs + ' threads');
        for (var i = 0; i < numCPUs; i++) {
          var worker = new Worker(__filename);

          //var worker = fork();
        }
    });

    suite.run({ async: true });

});
} else {
  let rootStore = open(testDirPath, {
    noMemInit: true,
    //winMemoryPriority: 4,
  })
  store = rootStore.openDB('testing', {
    sharedStructuresKey: 100000000,
    keyIsUint32: true,    
  })

  // other threads
    suite.add('put', {
      defer: true,
      fn: setData
    });
    suite.add('get', getData);
    suite.add('getBinaryFast', getBinaryFast);
    suite.on('cycle', function (event) {
      if (result && result.then) {
        let start = Date.now()
        result.then(() => {
          console.log('last commit took ' + (Date.now() - start) + 'ms')
        })
      }
      console.log(String(event.target));
    });
    suite.run({ async: true });

}
