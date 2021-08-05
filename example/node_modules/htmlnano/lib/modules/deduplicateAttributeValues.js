"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = collapseAttributeWhitespace;

var _collapseAttributeWhitespace = require("./collapseAttributeWhitespace");

/** Deduplicate values inside list-like attributes (e.g. class, rel) */
function collapseAttributeWhitespace(tree) {
  tree.walk(node => {
    if (!node.attrs) {
      return node;
    }

    Object.keys(node.attrs).forEach(attrName => {
      const attrNameLower = attrName.toLowerCase();

      if (!_collapseAttributeWhitespace.attributesWithLists.has(attrNameLower)) {
        return;
      }

      const attrValues = node.attrs[attrName].split(/\s/);
      const uniqeAttrValues = new Set();
      const deduplicatedAttrValues = [];
      attrValues.forEach(attrValue => {
        if (!attrValue) {
          // Keep whitespaces
          deduplicatedAttrValues.push('');
          return;
        }

        if (uniqeAttrValues.has(attrValue)) {
          return;
        }

        deduplicatedAttrValues.push(attrValue);
        uniqeAttrValues.add(attrValue);
      });
      node.attrs[attrName] = deduplicatedAttrValues.join(' ');
    });
    return node;
  });
  return tree;
}