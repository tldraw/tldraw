"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.blobToBuffer = blobToBuffer;
exports.blobToString = blobToString;

var _ = require("./");

function _stream() {
  const data = require("stream");

  _stream = function () {
    return data;
  };

  return data;
}

function blobToBuffer(blob) {
  if (blob instanceof _stream().Readable) {
    return (0, _.bufferStream)(blob);
  } else if (blob instanceof Buffer) {
    return Promise.resolve(Buffer.from(blob));
  } else {
    return Promise.resolve(Buffer.from(blob, 'utf8'));
  }
}

async function blobToString(blob) {
  if (blob instanceof _stream().Readable) {
    return (await (0, _.bufferStream)(blob)).toString();
  } else if (blob instanceof Buffer) {
    return blob.toString();
  } else {
    return blob;
  }
}