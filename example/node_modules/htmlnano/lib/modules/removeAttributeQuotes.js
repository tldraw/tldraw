"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = removeAttributeQuotes;

// Specification: https://html.spec.whatwg.org/multipage/syntax.html#attributes-2
// See also: https://github.com/posthtml/posthtml-render/pull/30
// See also: https://github.com/posthtml/htmlnano/issues/6#issuecomment-707105334

/** Disable quoteAllAttributes while not overriding the configuration */
function removeAttributeQuotes(tree) {
  if (tree.options && typeof tree.options.quoteAllAttributes === 'undefined') {
    tree.options.quoteAllAttributes = false;
  }

  return tree;
}