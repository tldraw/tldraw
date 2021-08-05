"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = mergeStyles;

var _helpers = require("../helpers");

/* Merge multiple <style> into one */
function mergeStyles(tree) {
  const styleNodes = {};
  tree.match({
    tag: 'style'
  }, node => {
    const nodeAttrs = node.attrs || {}; // Skip <style scoped></style>
    // https://developer.mozilla.org/en/docs/Web/HTML/Element/style

    if (nodeAttrs.scoped !== undefined) {
      return node;
    }

    if ((0, _helpers.isAmpBoilerplate)(node)) {
      return node;
    }

    const styleType = nodeAttrs.type || 'text/css';
    const styleMedia = nodeAttrs.media || 'all';
    const styleKey = styleType + '_' + styleMedia;

    if (styleNodes[styleKey]) {
      const styleContent = (node.content || []).join(' ');
      styleNodes[styleKey].content.push(' ' + styleContent);
      return '';
    }

    node.content = node.content || [];
    styleNodes[styleKey] = node;
    return node;
  });
  return tree;
}