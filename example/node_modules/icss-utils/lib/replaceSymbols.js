"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _replaceValueSymbols = _interopRequireDefault(require("./replaceValueSymbols.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const replaceSymbols = (css, replacements) => {
  css.walk(node => {
    if (node.type === "decl" && node.value) {
      node.value = (0, _replaceValueSymbols.default)(node.value.toString(), replacements);
    } else if (node.type === "rule" && node.selector) {
      node.selector = (0, _replaceValueSymbols.default)(node.selector.toString(), replacements);
    } else if (node.type === "atrule" && node.params) {
      node.params = (0, _replaceValueSymbols.default)(node.params.toString(), replacements);
    }
  });
};

var _default = replaceSymbols;
exports.default = _default;