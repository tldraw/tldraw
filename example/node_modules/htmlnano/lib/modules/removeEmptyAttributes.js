"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = removeEmptyAttributes;
// Source: https://www.w3.org/TR/html4/sgml/dtd.html#events (Generic Attributes)
const safeToRemoveAttrs = new Set(['id', 'class', 'style', 'title', 'lang', 'dir', 'onclick', 'ondblclick', 'onmousedown', 'onmouseup', 'onmouseover', 'onmousemove', 'onmouseout', 'onkeypress', 'onkeydown', 'onkeyup']);
/** Removes empty attributes */

function removeEmptyAttributes(tree) {
  tree.walk(node => {
    if (!node.attrs) {
      return node;
    }

    Object.entries(node.attrs).forEach(([attrName, attrValue]) => {
      const attrNameLower = attrName.toLowerCase();

      if (!safeToRemoveAttrs.has(attrNameLower)) {
        return;
      }

      if (attrValue === '' || (attrValue || '').match(/^\s+$/)) {
        delete node.attrs[attrName];
      }
    });
    return node;
  });
  return tree;
}