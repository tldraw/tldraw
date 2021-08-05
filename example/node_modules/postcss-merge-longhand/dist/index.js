"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _decl = _interopRequireDefault(require("./lib/decl"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function pluginCreator() {
  return {
    postcssPlugin: 'postcss-merge-longhand',

    OnceExit(css) {
      css.walkRules(rule => {
        _decl.default.forEach(p => {
          p.explode(rule);
          p.merge(rule);
        });
      });
    }

  };
}

pluginCreator.postcss = true;
var _default = pluginCreator;
exports.default = _default;
module.exports = exports.default;