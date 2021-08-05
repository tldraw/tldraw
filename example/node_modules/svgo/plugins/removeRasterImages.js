'use strict';

exports.type = 'perItem';

exports.active = false;

exports.description = 'removes raster images (disabled by default)';

/**
 * Remove raster images references in <image>.
 *
 * @see https://bugs.webkit.org/show_bug.cgi?id=63548
 *
 * @param {Object} item current iteration item
 * @return {Boolean} if false, item will be filtered out
 *
 * @author Kir Belevich
 */
exports.fn = function (item) {
  if (
    item.type === 'element' &&
    item.name === 'image' &&
    item.attributes['xlink:href'] != null &&
    /(\.|image\/)(jpg|png|gif)/.test(item.attributes['xlink:href'])
  ) {
    return false;
  }
};
