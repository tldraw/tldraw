"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

/**
 * Returns the shortest string in array
 */
const getShortestString = strings => {
  let shortest = null;

  for (let string of strings) {
    if (shortest === null || string.length < shortest.length) {
      shortest = string;
    }
  }

  return shortest;
};

var _default = getShortestString;
exports.default = _default;
module.exports = exports.default;