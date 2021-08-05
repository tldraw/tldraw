'use strict';

const { selectAll, selectOne, is } = require('css-select');
const xastAdaptor = require('./svgo/css-select-adapter.js');

const cssSelectOptions = {
  xmlMode: true,
  adapter: xastAdaptor,
};

const querySelectorAll = (node, selector) => {
  return selectAll(selector, node, cssSelectOptions);
};
exports.querySelectorAll = querySelectorAll;

const querySelector = (node, selector) => {
  return selectOne(selector, node, cssSelectOptions);
};
exports.querySelector = querySelector;

const matches = (node, selector) => {
  return is(node, selector, cssSelectOptions);
};
exports.matches = matches;

const closestByName = (node, name) => {
  let currentNode = node;
  while (currentNode) {
    if (currentNode.type === 'element' && currentNode.name === name) {
      return currentNode;
    }
    currentNode = currentNode.parentNode;
  }
  return null;
};
exports.closestByName = closestByName;

const traverseBreak = Symbol();
exports.traverseBreak = traverseBreak;

const traverse = (node, fn) => {
  if (fn(node) === traverseBreak) {
    return traverseBreak;
  }
  if (node.type === 'root' || node.type === 'element') {
    for (const child of node.children) {
      if (traverse(child, fn) === traverseBreak) {
        return traverseBreak;
      }
    }
  }
};
exports.traverse = traverse;

const visit = (node, visitor) => {
  const callbacks = visitor[node.type];
  if (callbacks && callbacks.enter) {
    callbacks.enter(node);
  }
  // visit root children
  if (node.type === 'root') {
    // copy children array to not loose cursor when children is spliced
    for (const child of node.children) {
      visit(child, visitor);
    }
  }
  // visit element children if still attached to parent
  if (node.type === 'element') {
    if (node.parentNode.children.includes(node)) {
      for (const child of node.children) {
        visit(child, visitor);
      }
    }
  }
  if (callbacks && callbacks.exit) {
    callbacks.exit(node);
  }
};
exports.visit = visit;

const detachNodeFromParent = (node) => {
  const parentNode = node.parentNode;
  // avoid splice to not break for loops
  parentNode.children = parentNode.children.filter((child) => child !== node);
};
exports.detachNodeFromParent = detachNodeFromParent;
