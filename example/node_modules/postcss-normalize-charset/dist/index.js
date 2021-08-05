"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
const charset = 'charset'; // eslint-disable-next-line no-control-regex

const nonAscii = /[^\x00-\x7F]/;

function pluginCreator(opts = {}) {
  return {
    postcssPlugin: 'postcss-normalize-' + charset,

    OnceExit(css, {
      AtRule
    }) {
      let charsetRule;
      let nonAsciiNode;
      css.walk(node => {
        if (node.type === 'atrule' && node.name === charset) {
          if (!charsetRule) {
            charsetRule = node;
          }

          node.remove();
        } else if (!nonAsciiNode && node.parent === css && nonAscii.test(node.toString())) {
          nonAsciiNode = node;
        }
      });

      if (nonAsciiNode) {
        if (!charsetRule && opts.add !== false) {
          charsetRule = new AtRule({
            name: charset,
            params: '"utf-8"'
          });
        }

        if (charsetRule) {
          charsetRule.source = nonAsciiNode.source;
          css.prepend(charsetRule);
        }
      }
    }

  };
}

pluginCreator.postcss = true;
var _default = pluginCreator;
exports.default = _default;
module.exports = exports.default;