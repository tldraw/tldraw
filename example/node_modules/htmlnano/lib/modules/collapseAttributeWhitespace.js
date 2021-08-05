"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = collapseAttributeWhitespace;
exports.attributesWithLists = void 0;
const attributesWithLists = new Set(['class', 'rel', 'ping']);
/** Collapse whitespaces inside list-like attributes (e.g. class, rel) */

exports.attributesWithLists = attributesWithLists;

function collapseAttributeWhitespace(tree) {
  tree.walk(node => {
    if (!node.attrs) {
      return node;
    }

    Object.entries(node.attrs).forEach(([attrName, attrValue]) => {
      const attrNameLower = attrName.toLowerCase();

      if (!attributesWithLists.has(attrNameLower)) {
        return;
      }

      const newAttrValue = attrValue.replace(/\s+/g, ' ').trim();
      node.attrs[attrName] = newAttrValue;
    });
    return node;
  });
  return tree;
}