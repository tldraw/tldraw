'use strict';

const { elemsGroups } = require('./_collections');

exports.type = 'perItem';

exports.active = true;

exports.description = 'removes elements in <defs> without id';

/**
 * Removes content of defs and properties that aren't rendered directly without ids.
 *
 * @param {Object} item current iteration item
 * @return {Boolean} if false, item will be filtered out
 *
 * @author Lev Solntsev
 */
exports.fn = function (item) {
  if (item.type === 'element') {
    if (item.name === 'defs') {
      item.children = getUsefulItems(item, []);
      if (item.children.length === 0) {
        return false;
      }
    } else if (
      elemsGroups.nonRendering.includes(item.name) &&
      item.attributes.id == null
    ) {
      return false;
    }
  }
};

function getUsefulItems(item, usefulItems) {
  for (const child of item.children) {
    if (child.type === 'element') {
      if (child.attributes.id != null || child.name === 'style') {
        usefulItems.push(child);
        child.parentNode = item;
      } else {
        child.children = getUsefulItems(child, usefulItems);
      }
    }
  }

  return usefulItems;
}
