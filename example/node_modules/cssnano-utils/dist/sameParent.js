"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = sameParent;

/**
 * @param {postcss.ChildNode} nodeA
 * @param {postcss.ChildNode} nodeB
 * @return {boolean}
 */
function checkMatch(nodeA, nodeB) {
  if (nodeA.type === 'atrule' && nodeB.type === 'atrule') {
    return nodeA.params === nodeB.params && nodeA.name.toLowerCase() === nodeB.name.toLowerCase();
  }

  return nodeA.type === nodeB.type;
}
/**
 * @param {postcss.ChildNode} nodeA
 * @param {postcss.ChildNode} nodeB
 * @return {boolean}
 */


function sameParent(nodeA, nodeB) {
  if (!nodeA.parent) {
    // A is orphaned, return if B is orphaned as well
    return !nodeB.parent;
  }

  if (!nodeB.parent) {
    // B is orphaned and A is not
    return false;
  } // Check if parents match


  if (!checkMatch(nodeA.parent, nodeB.parent)) {
    return false;
  } // Check parents' parents


  return sameParent(nodeA.parent, nodeB.parent);
}

module.exports = exports.default;