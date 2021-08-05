"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = minifyConditionalComments;

var _htmlnano = _interopRequireDefault(require("../htmlnano"));

var _helpers = require("../helpers");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Spec: https://docs.microsoft.com/en-us/previous-versions/windows/internet-explorer/ie-developer/compatibility/ms537512(v=vs.85)
const CONDITIONAL_COMMENT_REGEXP = /(<!--\[if\s+?[^<>[\]]+?]>)([\s\S]+?)(<!\[endif\]-->)/gm;
/** Minify content inside conditional comments */

async function minifyConditionalComments(tree, htmlnanoOptions) {
  // forEach, tree.walk, tree.match just don't support Promise.
  for (let i = 0, len = tree.length; i < len; i++) {
    const node = tree[i];

    if (typeof node === 'string' && (0, _helpers.isConditionalComment)(node)) {
      tree[i] = await minifycontentInsideConditionalComments(node, htmlnanoOptions);
    }

    if (node.content && node.content.length) {
      tree[i].content = await minifyConditionalComments(node.content, htmlnanoOptions);
    }
  }

  return tree;
}

async function minifycontentInsideConditionalComments(text, htmlnanoOptions) {
  let match;
  const matches = []; // FIXME!
  // String#matchAll is supported since Node.js 12

  while ((match = CONDITIONAL_COMMENT_REGEXP.exec(text)) !== null) {
    matches.push([match[1], match[2], match[3]]);
  }

  if (!matches.length) {
    return Promise.resolve(text);
  }

  return Promise.all(matches.map(async match => {
    const result = await _htmlnano.default.process(match[1], htmlnanoOptions, {}, {});
    let minified = result.html;

    if (match[1].includes('<html') && minified.includes('</html>')) {
      minified = minified.replace('</html>', '');
    }

    return match[0] + minified + match[2];
  }));
}