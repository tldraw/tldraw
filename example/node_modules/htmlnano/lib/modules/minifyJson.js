"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = minifyJson;

/* Minify JSON inside <script> tags */
function minifyJson(tree) {
  // Match all <script> tags which have JSON mime type
  tree.match({
    tag: 'script',
    attrs: {
      type: /(\/|\+)json/
    }
  }, node => {
    let content = (node.content || []).join('');

    if (!content) {
      return node;
    }

    try {
      content = JSON.stringify(JSON.parse(content));
    } catch (error) {
      return node;
    }

    node.content = [content];
    return node;
  });
  return tree;
}