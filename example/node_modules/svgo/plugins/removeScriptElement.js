'use strict';

exports.type = 'perItem';

exports.active = false;

exports.description = 'removes <script> elements (disabled by default)';

/**
 * Remove <script>.
 *
 * https://www.w3.org/TR/SVG11/script.html
 *
 * @param {Object} item current iteration item
 * @return {Boolean} if false, item will be filtered out
 *
 * @author Patrick Klingemann
 */
exports.fn = function (item) {
  return !item.isElem('script');
};
