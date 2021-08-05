"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isAmpBoilerplate = isAmpBoilerplate;
exports.isComment = isComment;
exports.isConditionalComment = isConditionalComment;
exports.isStyleNode = isStyleNode;
exports.extractCssFromStyleNode = extractCssFromStyleNode;
const ampBoilerplateAttributes = ['amp-boilerplate', 'amp4ads-boilerplate', 'amp4email-boilerplate'];

function isAmpBoilerplate(node) {
  if (!node.attrs) {
    return false;
  }

  for (const attr of ampBoilerplateAttributes) {
    if (attr in node.attrs) {
      return true;
    }
  }

  return false;
}

function isComment(content) {
  return (content || '').trim().startsWith('<!--');
}

function isConditionalComment(content) {
  return (content || '').trim().startsWith('<!--[if');
}

function isStyleNode(node) {
  return node.tag === 'style' && !isAmpBoilerplate(node) && 'content' in node && node.content.length > 0;
}

function extractCssFromStyleNode(node) {
  return Array.isArray(node.content) ? node.content.join(' ') : node.content;
}