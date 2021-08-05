"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.empty = void 0;

function _nodeLibsBrowser() {
  const data = _interopRequireDefault(require("@parcel/node-libs-browser"));

  _nodeLibsBrowser = function () {
    return data;
  };

  return data;
}

function _module() {
  const data = require("module");

  _module = function () {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// $FlowFixMe this is untyped
const empty = require.resolve('./_empty.js'); // $FlowFixMe


exports.empty = empty;
let builtins = Object.create(null); // use definite (current) list of Node builtins

for (let key of _module().builtinModules) {
  builtins[key] = empty;
} // load the polyfill where available


for (let key in _nodeLibsBrowser().default) {
  builtins[key] = _nodeLibsBrowser().default[key] || empty;
}

var _default = builtins;
exports.default = _default;