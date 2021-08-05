"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = minifyColor;

var _color = require("./lib/color");

var _getShortestString = _interopRequireDefault(require("./lib/getShortestString"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Performs color value minification
 *
 * @param {string} input - CSS value
 * @param {boolean} options.supportsAlphaHex - Does the browser support 4 & 8 character hex notation
 * @param {boolean} options.supportsTransparent – Does the browser support "transparent" value properly
 */
function minifyColor(input, options = {}) {
  const settings = {
    supportsAlphaHex: false,
    supportsTransparent: true,
    ...options
  };
  const instance = (0, _color.process)(input);

  if (instance.isValid()) {
    // Try to shorten the string if it is a valid CSS color value.
    // Fall back to the original input if it's smaller or has equal length/
    return (0, _getShortestString.default)([input.toLowerCase(), instance.toShortString(settings)]);
  } else {
    // Possibly malformed, so pass through
    return input;
  }
}

module.exports = exports.default;