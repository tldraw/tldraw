"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function _stream() {
  const data = require("stream");

  _stream = function () {
    return data;
  };

  return data;
}

/*
 * "Taps" into the contents of a flowing stream, yielding chunks to the passed
 * callback. Continues to pass data chunks down the stream.
 */
class TapStream extends _stream().Transform {
  constructor(tap, options) {
    super({ ...options
    });
    this._tap = tap;
  }

  _transform(chunk, encoding, callback) {
    try {
      this._tap(Buffer.from(chunk));

      callback(null, chunk);
    } catch (err) {
      callback(err);
    }
  }

}

exports.default = TapStream;