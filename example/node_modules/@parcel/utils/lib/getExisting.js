"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getExisting;

function _fs() {
  const data = _interopRequireDefault(require("fs"));

  _fs = function () {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Creates an object that contains both source and minified (using the source as a fallback).
 * e.g. builtins.min.js and builtins.js.
 */
function getExisting(minifiedPath, sourcePath) {
  let source = _fs().default.readFileSync(sourcePath, 'utf8').trim();

  return {
    source,
    minified: _fs().default.existsSync(minifiedPath) ? _fs().default.readFileSync(minifiedPath, 'utf8').trim().replace(/;$/, '') : source
  };
}