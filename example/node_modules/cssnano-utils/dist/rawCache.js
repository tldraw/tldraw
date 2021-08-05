"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

const pluginCreator = () => {
  return {
    postcssPlugin: 'cssnano-util-raw-cache',

    OnceExit(css, {
      result
    }) {
      result.root.rawCache = {
        colon: ':',
        indent: '',
        beforeDecl: '',
        beforeRule: '',
        beforeOpen: '',
        beforeClose: '',
        beforeComment: '',
        after: '',
        emptyBody: '',
        commentLeft: '',
        commentRight: ''
      };
    }

  };
};

pluginCreator.postcss = true;
var _default = pluginCreator;
exports.default = _default;
module.exports = exports.default;