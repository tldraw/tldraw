"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.relativeBundlePath = relativeBundlePath;

function _path() {
  const data = _interopRequireDefault(require("path"));

  _path = function () {
    return data;
  };

  return data;
}

var _path2 = require("./path");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function relativeBundlePath(from, to, opts = {
  leadingDotSlash: true
}) {
  let fromPath = _path().default.join(from.target.distDir, from.name);

  let toPath = _path().default.join(to.target.distDir, to.name);

  return (0, _path2.relativePath)(_path().default.dirname(fromPath), toPath, opts.leadingDotSlash);
}