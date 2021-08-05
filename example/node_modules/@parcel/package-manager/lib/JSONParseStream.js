"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function _logger() {
  const data = _interopRequireDefault(require("@parcel/logger"));

  _logger = function () {
    return data;
  };

  return data;
}

function _stream() {
  const data = require("stream");

  _stream = function () {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Transforms chunks of json strings to parsed objects.
// Pair with split2 to parse stream of newline-delimited text.
class JSONParseStream extends _stream().Transform {
  constructor(options) {
    super({ ...options,
      objectMode: true
    });
  } // $FlowFixMe We are in object mode, so we emit objects, not strings


  _transform(chunk, encoding, callback) {
    try {
      let parsed;

      try {
        parsed = JSON.parse(chunk.toString());
      } catch (e) {
        // Be permissive and ignoreJSON parse errors in case there was
        // a non-JSON line in the package manager's stdout.
        _logger().default.verbose({
          message: 'Ignored invalid JSON message: ' + chunk.toString(),
          origin: '@parcel/package-manager'
        });

        return;
      }

      callback(null, parsed);
    } catch (err) {
      callback(err);
    }
  }

}

exports.default = JSONParseStream;