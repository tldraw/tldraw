"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
const plugin = 'postcss-discard-empty';

function discardAndReport(css, result) {
  function discardEmpty(node) {
    const {
      type,
      nodes: sub,
      params
    } = node;

    if (sub) {
      node.each(discardEmpty);
    }

    if (type === 'decl' && !node.value || type === 'rule' && !node.selector || sub && !sub.length || type === 'atrule' && (!sub && !params || !params && !sub.length)) {
      node.remove();
      result.messages.push({
        type: 'removal',
        plugin,
        node
      });
    }
  }

  css.each(discardEmpty);
}

function pluginCreator() {
  return {
    postcssPlugin: plugin,

    OnceExit(css, {
      result
    }) {
      discardAndReport(css, result);
    }

  };
}

pluginCreator.postcss = true;
var _default = pluginCreator;
exports.default = _default;
module.exports = exports.default;