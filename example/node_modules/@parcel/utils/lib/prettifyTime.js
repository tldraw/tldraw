"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = prettifyTime;

function prettifyTime(timeInMs) {
  return timeInMs < 1000 ? `${timeInMs}ms` : `${(timeInMs / 1000).toFixed(2)}s`;
}