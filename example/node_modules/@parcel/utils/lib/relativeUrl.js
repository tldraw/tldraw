"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = relativeUrl;

function _path() {
  const data = _interopRequireDefault(require("path"));

  _path = function () {
    return data;
  };

  return data;
}

function _url() {
  const data = _interopRequireDefault(require("url"));

  _url = function () {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function relativeUrl(from, to) {
  return _url().default.format(_url().default.parse(_path().default.relative(from, to)));
}