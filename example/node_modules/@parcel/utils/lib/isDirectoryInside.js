"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = isDirectoryInside;

function _path() {
  const data = _interopRequireDefault(require("path"));

  _path = function () {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function isDirectoryInside(child, parent) {
  const relative = _path().default.relative(parent, child);

  return !relative.startsWith('..') && !_path().default.isAbsolute(relative);
}