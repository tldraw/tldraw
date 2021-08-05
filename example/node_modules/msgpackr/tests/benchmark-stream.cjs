#!/usr/bin/env node

var PassThrough = require("stream").PassThrough;
var async = require("async");

let { PackrStream, UnpackrStream } = require("..");
var msgpack = require("msgpack-lite");
var Encoder = require("msgpack-lite/lib/encoder").Encoder;
var Decoder = require("msgpack-lite/lib/decoder").Decoder;
var notepack = require("notepack");

var pkg = require("../package.json");

// a sample fluentd message
var data = ["tag", [[1440949922, {"message": "hi there"}]]];
var packed = msgpack.encode(data); // 30 bytes per message
var packsize = packed.length;
var opcount = 1000000;
var joincount = 100;
var packjoin = repeatbuf(packed, joincount); // 3KB per chunk
var limit = 2;

var blocksToJoin = []
var streamForJoin = new PackrStream();
streamForJoin.on("data", data => blocksToJoin.push(data));
for (var j = 0; j < joincount; j++) {
  streamForJoin.write(data);
}
var packjoinWithRecords = Buffer.concat(blocksToJoin)

var argv = Array.prototype.slice.call(process.argv, 2);

if (argv[0] === "-v") {
  console.warn(pkg.name + " " + pkg.version);
  process.exit(0);
}

if (argv[0] - 0) limit = argv.shift() - 0;

var list = [
  ['new PackrStream().write(obj);', encode5],
  ['new UnpackrStream().write(buf);', decode5],
  ['stream.write(msgpack.encode(obj));', encode1],
  ['stream.write(msgpack.decode(buf));', decode1],
  ['stream.write(notepack.encode(obj));', encode4],
  ['stream.write(notepack.decode(buf));', decode4],
  ['msgpack.Encoder().on("data",ondata).encode(obj);', encode2],
  ['msgpack.createDecodeStream().write(buf);', decode3],
  ['msgpack.createEncodeStream().write(obj);', encode3],
  ['msgpack.Decoder().on("data",ondata).decode(buf);', decode2],
//  ['stream.write(Buffer.from(JSON.stringify(obj)));', stringify],
//  ['stream.write(JSON.parse(buf));', parse]
];

function encode5(callback) {
  var stream = new PackrStream();
  var cnt = counter(callback);
  stream.on("data", cnt.inc);
  stream.on("end", cnt.end);
  for (var j = 0; j < opcount; j++) {
    stream.write(data);
  }
  stream.end();
}

function encode1(callback) {
  var stream = new PassThrough();
  var cnt = counter(callback);
  stream.on("data", cnt.buf);
  stream.on("end", cnt.end);
  for (var j = 0; j < opcount; j++) {
    stream.write(msgpack.encode(data));
  }
  stream.end();
}

function encode2(callback) {
  var stream = new PassThrough();
  var cnt = counter(callback);
  stream.on("data", cnt.buf);
  stream.on("end", cnt.end);
  var encoder = Encoder();
  encoder.on("data", function(chunk) {
    stream.write(chunk);
  });
  encoder.on("end", function() {
    stream.end();
  });
  for (var j = 0; j < opcount; j++) {
    encoder.encode(data);
  }
  encoder.end();
}

function encode3(callback) {
  var stream = msgpack.createEncodeStream();
  var cnt = counter(callback);
  stream.on("data", cnt.buf);
  stream.on("end", cnt.end);
  for (var j = 0; j < opcount; j++) {
    stream.write(data);
  }
  stream.end();
}

function encode4(callback) {
  var stream = new PassThrough();
  var cnt = counter(callback);
  stream.on("data", cnt.buf);
  stream.on("end", cnt.end);
  for (var j = 0; j < opcount; j++) {
    stream.write(notepack.encode(data));
  }
  stream.end();
}

function decode5(callback) {
  var stream = new UnpackrStream();
  var cnt = counter(callback);
  stream.on("data", cnt.inc);
  stream.on("end", cnt.end);
  for (var j = 0; j < opcount / joincount; j++) {
    stream.write(packjoinWithRecords);
  }
  stream.end();
}

function decode1(callback) {
  var stream = new PassThrough({objectMode: true});
  var cnt = counter(callback);
  stream.on("data", cnt.inc);
  stream.on("end", cnt.end);
  for (var j = 0; j < opcount; j++) {
    stream.write(msgpack.decode(packed));
  }
  stream.end();
}

function decode2(callback) {
  var stream = new PassThrough({objectMode: true});
  var cnt = counter(callback);
  stream.on("data", cnt.inc);
  stream.on("end", cnt.end);
  var decoder = Decoder();
  decoder.on("data", function(chunk) {
    stream.write(chunk);
  });
  decoder.on("end", function() {
    stream.end();
  });
  for (var j = 0; j < opcount / joincount; j++) {
    decoder.decode(packjoin);
  }
  decoder.end();
}

function decode3(callback) {
  var stream = msgpack.createDecodeStream();
  var cnt = counter(callback);
  stream.on("data", cnt.inc);
  stream.on("end", cnt.end);
  for (var j = 0; j < opcount / joincount; j++) {
    stream.write(packjoin);
  }
  stream.end();
}

function decode4(callback) {
  var stream = new PassThrough({objectMode: true});
  var cnt = counter(callback);
  stream.on("data", cnt.inc);
  stream.on("end", cnt.end);
  for (var j = 0; j < opcount; j++) {
    stream.write(notepack.decode(packed));
  }
  stream.end();
}

function rpad(str, len, chr) {
  if (!chr) chr = " ";
  str += "";
  while (str.length < len) str += chr;
  return str;
}

function lpad(str, len, chr) {
  if (!chr) chr = " ";
  str += "";
  while (str.length < len) str = chr + str;
  return str;
}

function repeatbuf(buf, cnt) {
  var array = [];
  for (var i = 0; i < cnt; i++) {
    array.push(buf);
  }
  return Buffer.concat(array);
}

function counter(callback) {
  var cnt = 0;
  return {buf: b, inc: i, end: e};

  function b(buf) {
    cnt += buf.length / packsize;
  }

  function i() {
    cnt++;
  }

  function e() {
    cnt = Math.round(cnt);
    callback(null, cnt);
  }
}

function run() {
  // task filter
  if (argv.length) {
    list = list.filter(function(pair) {
      var name = pair[0];
      var match = argv.filter(function(grep) {
        return (name.indexOf(grep) > -1);
      });
      return match.length;
    });
  }

  // run tasks repeatedly
  var tasks = [];
  for (var i = 0; i < limit; i++) {
    tasks.push(oneset);
  }
  async.series(tasks, end);

  // run a series of tasks
  function oneset(callback) {
    async.eachSeries(list, bench, callback);
  }

  // run a single benchmark
  function bench(pair, callback) {
    process.stdout.write(".");
    var func = pair[1];
    var start = new Date() - 0;
    func(function(err, cnt) {
      var end = new Date() - 0;
      var array = pair[2] || (pair[2] = []);
      array.push(end - start);
      pair[3] = cnt;
      setTimeout(callback, 100);
    });
  }

  // show result
  function end() {
    var title = "operation (" + opcount + " x " + limit + ")";
    process.stdout.write("\n");

    // table header
    var COL1 = 48;
    console.log(rpad(title, COL1), "|", "  op   ", "|", " ms  ", "|", " op/s ");
    console.log(rpad("", COL1, "-"), "|", "------:", "|", "----:", "|", "-----:");

    // table body
    list.forEach(function(pair) {
      var name = pair[0];
      var op = pair[3];
      var array = pair[2];
      array = array.sort(function(a, b) {
        return a > b;
      });
      var fastest = array[0];
      var score = Math.floor(opcount / fastest * 1000);
      console.log(rpad(name, COL1), "|", lpad(op, 7), "|", lpad(fastest, 5), "|", lpad(score, 6));
    });
  }
}

run();
