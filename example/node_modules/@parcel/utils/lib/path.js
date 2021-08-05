"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isAbsolute = isAbsolute;
exports.normalizeSeparators = normalizeSeparators;
exports.normalizePath = normalizePath;
exports.relativePath = relativePath;

function _path() {
  const data = _interopRequireDefault(require("path"));

  _path = function () {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const ABSOLUTE_PATH_REGEX = /^([a-zA-Z]:){0,1}[\\/]+/;
const SEPARATOR_REGEX = /[\\]+/g;

function isAbsolute(filepath) {
  return ABSOLUTE_PATH_REGEX.test(filepath);
}

function normalizeSeparators(filePath) {
  return filePath.replace(SEPARATOR_REGEX, '/');
}

function normalizePath(filePath, leadingDotSlash = true) {
  if (leadingDotSlash && (filePath[0] !== '.' || filePath[1] !== '.' && filePath[1] !== '/' && filePath[1] !== '\\') && !_path().default.isAbsolute(filePath)) {
    return normalizeSeparators('./' + filePath);
  } else {
    return normalizeSeparators(filePath);
  }
}

function relativePath(from, to, leadingDotSlash = true) {
  // Fast path
  if (to.startsWith(from + '/')) {
    return (leadingDotSlash ? './' : '') + to.slice(from.length + 1);
  }

  return normalizePath(_path().default.relative(from, to), leadingDotSlash);
}