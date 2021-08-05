"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _getValue = _interopRequireDefault(require("./getValue"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _default = (...rules) => rules.map(_getValue.default).join(' ');

exports.default = _default;
module.exports = exports.default;