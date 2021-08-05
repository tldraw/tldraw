"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _default = node => ~node.value.search(/var\s*\(\s*--/i);

exports.default = _default;
module.exports = exports.default;