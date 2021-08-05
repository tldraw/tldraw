'use strict';

const { elemsGroups } = require('./_collections');

exports.type = 'perItemReverse';

exports.active = true;

exports.description = 'removes empty container elements';

/**
 * Remove empty containers.
 *
 * @see https://www.w3.org/TR/SVG11/intro.html#TermContainerElement
 *
 * @example
 * <defs/>
 *
 * @example
 * <g><marker><a/></marker></g>
 *
 * @param {Object} item current iteration item
 * @return {Boolean} if false, item will be filtered out
 *
 * @author Kir Belevich
 */
exports.fn = function (item) {
  if (item.type === 'element') {
    return (
      item.children.length !== 0 ||
      elemsGroups.container.includes(item.name) === false ||
      item.name === 'svg' ||
      // empty patterns may contain reusable configuration
      (item.name === 'pattern' && Object.keys(item.attributes).length !== 0) ||
      // The 'g' may not have content, but the filter may cause a rectangle
      // to be created and filled with pattern.
      (item.name === 'g' && item.attributes.filter != null) ||
      // empty <mask> hides masked element
      (item.name === 'mask' && item.attributes.id != null)
    );
  }
  return true;
};
