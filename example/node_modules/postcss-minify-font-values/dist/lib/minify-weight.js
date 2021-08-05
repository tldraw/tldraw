"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = _default;

function _default(value) {
  const lowerCasedValue = value.toLowerCase();
  return lowerCasedValue === 'normal' ? '400' : lowerCasedValue === 'bold' ? '700' : value;
}

module.exports = exports.default;