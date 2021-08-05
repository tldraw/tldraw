'use strict';

exports.type = 'perItem';

exports.active = true;

exports.description = 'converts non-eccentric <ellipse>s to <circle>s';

/**
 * Converts non-eccentric <ellipse>s to <circle>s.
 *
 * @see https://www.w3.org/TR/SVG11/shapes.html
 *
 * @param {Object} item current iteration item
 * @return {Boolean} if false, item will be filtered out
 *
 * @author Taylor Hunt
 */
exports.fn = function (item) {
  if (item.isElem('ellipse')) {
    const rx = item.attributes.rx || 0;
    const ry = item.attributes.ry || 0;

    if (
      rx === ry ||
      rx === 'auto' ||
      ry === 'auto' // SVG2
    ) {
      var radius = rx !== 'auto' ? rx : ry;
      item.renameElem('circle');
      delete item.attributes.rx;
      delete item.attributes.ry;
      item.attributes.r = radius;
    }
  }
};
