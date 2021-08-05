"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = _default;

var _postcssValueParser = require("postcss-value-parser");

var _keywords = _interopRequireDefault(require("./keywords"));

var _minifyFamily = _interopRequireDefault(require("./minify-family"));

var _minifyWeight = _interopRequireDefault(require("./minify-weight"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _default(nodes, opts) {
  let i, max, node, familyStart, family;
  let hasSize = false;

  for (i = 0, max = nodes.length; i < max; i += 1) {
    node = nodes[i];

    if (node.type === 'word') {
      if (hasSize) {
        continue;
      }

      const value = node.value.toLowerCase();

      if (value === 'normal' || value === 'inherit' || value === 'initial' || value === 'unset') {
        familyStart = i;
      } else if (~_keywords.default.style.indexOf(value) || (0, _postcssValueParser.unit)(value)) {
        familyStart = i;
      } else if (~_keywords.default.variant.indexOf(value)) {
        familyStart = i;
      } else if (~_keywords.default.weight.indexOf(value)) {
        node.value = (0, _minifyWeight.default)(value);
        familyStart = i;
      } else if (~_keywords.default.stretch.indexOf(value)) {
        familyStart = i;
      } else if (~_keywords.default.size.indexOf(value) || (0, _postcssValueParser.unit)(value)) {
        familyStart = i;
        hasSize = true;
      }
    } else if (node.type === 'function' && nodes[i + 1] && nodes[i + 1].type === 'space') {
      familyStart = i;
    } else if (node.type === 'div' && node.value === '/') {
      familyStart = i + 1;
      break;
    }
  }

  familyStart += 2;
  family = (0, _minifyFamily.default)(nodes.slice(familyStart), opts);
  return nodes.slice(0, familyStart).concat(family);
}

module.exports = exports.default;