"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = removeOptionalTags;

var _helpers = require("../helpers");

const startWithWhitespacePattern = /^\s+/;
const bodyStartTagCantBeOmittedWithFirstChildTags = new Set(['meta', 'link', 'script', 'style']);
const tbodyStartTagCantBeOmittedWithPrecededTags = new Set(['tbody', 'thead', 'tfoot']);
const tbodyEndTagCantBeOmittedWithFollowedTags = new Set(['tbody', 'tfoot']);

function isEmptyTextNode(node) {
  if (typeof node === 'string' && node.trim() === '') {
    return true;
  }

  return false;
}

function isEmptyNode(node) {
  if (!node.content) {
    return true;
  }

  if (node.content.length) {
    return !node.content.filter(n => typeof n === 'string' && isEmptyTextNode(n) ? false : true).length;
  }

  return true;
}

function getFirstChildTag(node, nonEmpty = true) {
  if (node.content && node.content.length) {
    if (nonEmpty) {
      for (const childNode of node.content) {
        if (childNode.tag) return childNode;
        if (typeof childNode === 'string' && !isEmptyTextNode(childNode)) return childNode;
      }
    } else {
      return node.content[0] || null;
    }
  }

  return null;
}

function getPrevNode(tree, currentNodeIndex, nonEmpty = false) {
  if (nonEmpty) {
    for (let i = currentNodeIndex - 1; i >= 0; i--) {
      const node = tree[i];
      if (node.tag) return node;
      if (typeof node === 'string' && !isEmptyTextNode(node)) return node;
    }
  } else {
    return tree[currentNodeIndex - 1] || null;
  }

  return null;
}

function getNextNode(tree, currentNodeIndex, nonEmpty = false) {
  if (nonEmpty) {
    for (let i = currentNodeIndex + 1; i < tree.length; i++) {
      const node = tree[i];
      if (node.tag) return node;
      if (typeof node === 'string' && !isEmptyTextNode(node)) return node;
    }
  } else {
    return tree[currentNodeIndex + 1] || null;
  }

  return null;
} // Specification https://html.spec.whatwg.org/multipage/syntax.html#optional-tags

/** Remove optional tag in the DOM */


function removeOptionalTags(tree) {
  tree.forEach((node, index) => {
    if (!node.tag) return node;
    if (node.attrs && Object.keys(node.attrs).length) return node; // const prevNode = getPrevNode(tree, index);

    const prevNonEmptyNode = getPrevNode(tree, index, true);
    const nextNode = getNextNode(tree, index);
    const nextNonEmptyNode = getNextNode(tree, index, true);
    const firstChildNode = getFirstChildTag(node, false);
    const firstNonEmptyChildNode = getFirstChildTag(node);
    /**
     * An "html" element's start tag may be omitted if the first thing inside the "html" element is not a comment.
     * An "html" element's end tag may be omitted if the "html" element is not IMMEDIATELY followed by a comment.
     */

    if (node.tag === 'html') {
      let isHtmlStartTagCanBeOmitted = true;
      let isHtmlEndTagCanBeOmitted = true;

      if (typeof firstNonEmptyChildNode === 'string' && (0, _helpers.isComment)(firstNonEmptyChildNode)) {
        isHtmlStartTagCanBeOmitted = false;
      }

      if (typeof nextNonEmptyNode === 'string' && (0, _helpers.isComment)(nextNonEmptyNode)) {
        isHtmlEndTagCanBeOmitted = false;
      }

      if (isHtmlStartTagCanBeOmitted && isHtmlEndTagCanBeOmitted) {
        node.tag = false;
      }
    }
    /**
     * A "head" element's start tag may be omitted if the element is empty, or if the first thing inside the "head" element is an element.
     * A "head" element's end tag may be omitted if the "head" element is not IMMEDIATELY followed by ASCII whitespace or a comment.
     */


    if (node.tag === 'head') {
      let isHeadStartTagCanBeOmitted = false;
      let isHeadEndTagCanBeOmitted = true;

      if (isEmptyNode(node) || firstNonEmptyChildNode && firstNonEmptyChildNode.tag) {
        isHeadStartTagCanBeOmitted = true;
      }

      if (nextNode && typeof nextNode === 'string' && startWithWhitespacePattern.test(nextNode) || nextNonEmptyNode && typeof nextNonEmptyNode === 'string' && (0, _helpers.isComment)(nextNode)) {
        isHeadEndTagCanBeOmitted = false;
      }

      if (isHeadStartTagCanBeOmitted && isHeadEndTagCanBeOmitted) {
        node.tag = false;
      }
    }
    /**
     * A "body" element's start tag may be omitted if the element is empty, or if the first thing inside the "body" element is not ASCII whitespace or a comment, except if the first thing inside the "body" element is a "meta", "link", "script", "style", or "template" element.
     * A "body" element's end tag may be omitted if the "body" element is not IMMEDIATELY followed by a comment.
     */


    if (node.tag === 'body') {
      let isBodyStartTagCanBeOmitted = true;
      let isBodyEndTagCanBeOmitted = true;

      if (typeof firstChildNode === 'string' && startWithWhitespacePattern.test(firstChildNode) || typeof firstNonEmptyChildNode === 'string' && (0, _helpers.isComment)(firstNonEmptyChildNode)) {
        isBodyStartTagCanBeOmitted = false;
      }

      if (firstNonEmptyChildNode && firstNonEmptyChildNode.tag && bodyStartTagCantBeOmittedWithFirstChildTags.has(firstNonEmptyChildNode.tag)) {
        isBodyStartTagCanBeOmitted = false;
      }

      if (nextNode && typeof nextNode === 'string' && (0, _helpers.isComment)(nextNode)) {
        isBodyEndTagCanBeOmitted = false;
      }

      if (isBodyStartTagCanBeOmitted && isBodyEndTagCanBeOmitted) {
        node.tag = false;
      }
    }
    /**
     * A "colgroup" element's start tag may be omitted if the first thing inside the "colgroup" element is a "col" element, and if the element is not IMMEDIATELY preceded by another "colgroup" element. It can't be omitted if the element is empty.
     * A "colgroup" element's end tag may be omitted if the "colgroup" element is not IMMEDIATELY followed by ASCII whitespace or a comment.
     */


    if (node.tag === 'colgroup') {
      let isColgroupStartTagCanBeOmitted = false;
      let isColgroupEndTagCanBeOmitted = true;

      if (firstNonEmptyChildNode && firstNonEmptyChildNode.tag && firstNonEmptyChildNode.tag === 'col') {
        isColgroupStartTagCanBeOmitted = true;
      }

      if (prevNonEmptyNode && prevNonEmptyNode.tag && prevNonEmptyNode.tag === 'colgroup') {
        isColgroupStartTagCanBeOmitted = false;
      }

      if (nextNode && typeof nextNode === 'string' && startWithWhitespacePattern.test(nextNode) || nextNonEmptyNode && typeof nextNonEmptyNode === 'string' && (0, _helpers.isComment)(nextNonEmptyNode)) {
        isColgroupEndTagCanBeOmitted = false;
      }

      if (isColgroupStartTagCanBeOmitted && isColgroupEndTagCanBeOmitted) {
        node.tag = false;
      }
    }
    /**
     * A "tbody" element's start tag may be omitted if the first thing inside the "tbody" element is a "tr" element, and if the element is not immediately preceded by another "tbody", "thead" or "tfoot" element. It can't be omitted if the element is empty.
     * A "tbody" element's end tag may be omitted if the "tbody" element is not IMMEDIATELY followed by a "tbody" or "tfoot" element.
     */


    if (node.tag === 'tbody') {
      let isTbodyStartTagCanBeOmitted = false;
      let isTbodyEndTagCanBeOmitted = true;

      if (firstNonEmptyChildNode && firstNonEmptyChildNode.tag && firstNonEmptyChildNode.tag === 'tr') {
        isTbodyStartTagCanBeOmitted = true;
      }

      if (prevNonEmptyNode && prevNonEmptyNode.tag && tbodyStartTagCantBeOmittedWithPrecededTags.has(prevNonEmptyNode.tag)) {
        isTbodyStartTagCanBeOmitted = false;
      }

      if (nextNonEmptyNode && nextNonEmptyNode.tag && tbodyEndTagCantBeOmittedWithFollowedTags.has(nextNonEmptyNode.tag)) {
        isTbodyEndTagCanBeOmitted = false;
      }

      if (isTbodyStartTagCanBeOmitted && isTbodyEndTagCanBeOmitted) {
        node.tag = false;
      }
    }

    if (node.content && node.content.length) {
      removeOptionalTags(node.content);
    }

    return node;
  });
  return tree;
}