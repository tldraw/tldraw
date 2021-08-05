"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = joinGridVal;

function joinGridVal(grid) {
  return grid.join(' / ').trim();
}

module.exports = exports.default;