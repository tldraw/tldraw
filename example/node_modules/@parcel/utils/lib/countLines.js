"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = countLines;

function countLines(string, startIndex = 0) {
  let lines = 1;

  for (let i = startIndex; i < string.length; i++) {
    if (string.charAt(i) === '\n') {
      lines++;
    }
  }

  return lines;
}