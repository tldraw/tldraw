"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.measureStreamLength = measureStreamLength;
exports.readableFromStringOrBuffer = readableFromStringOrBuffer;
exports.bufferStream = bufferStream;
exports.blobToStream = blobToStream;
exports.streamFromPromise = streamFromPromise;
exports.fallbackStream = fallbackStream;

function _stream() {
  const data = require("stream");

  _stream = function () {
    return data;
  };

  return data;
}

function measureStreamLength(stream) {
  return new Promise((resolve, reject) => {
    let length = 0;
    stream.on('data', chunk => {
      length += chunk;
    });
    stream.on('end', () => resolve(length));
    stream.on('error', reject);
  });
}

function readableFromStringOrBuffer(str) {
  // https://stackoverflow.com/questions/12755997/how-to-create-streams-from-string-in-node-js
  const stream = new (_stream().Readable)();
  stream.push(str);
  stream.push(null);
  return stream;
}

function bufferStream(stream) {
  return new Promise((resolve, reject) => {
    let buf = Buffer.from([]);
    stream.on('data', data => {
      buf = Buffer.concat([buf, data]);
    });
    stream.on('end', () => {
      resolve(buf);
    });
    stream.on('error', reject);
  });
}

function blobToStream(blob) {
  if (blob instanceof _stream().Readable) {
    return blob;
  }

  return readableFromStringOrBuffer(blob);
}

function streamFromPromise(promise) {
  const stream = new (_stream().PassThrough)();
  promise.then(blob => {
    if (blob instanceof _stream().Readable) {
      blob.pipe(stream);
    } else {
      stream.end(blob);
    }
  });
  return stream;
}

function fallbackStream(stream, fallback) {
  const res = new (_stream().PassThrough)();
  stream.on('error', err => {
    if (err.code === 'ENOENT') {
      fallback().pipe(res);
    } else {
      res.emit('error', err);
    }
  });
  stream.pipe(res);
  return res;
}