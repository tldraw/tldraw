'use strict';

const { traverse } = require('../lib/xast.js');

exports.type = 'full';

exports.active = true;

exports.description =
  'remove or cleanup enable-background attribute when possible';

/**
 * Remove or cleanup enable-background attr which coincides with a width/height box.
 *
 * @see https://www.w3.org/TR/SVG11/filters.html#EnableBackgroundProperty
 *
 * @example
 * <svg width="100" height="50" enable-background="new 0 0 100 50">
 *             ⬇
 * <svg width="100" height="50">
 *
 * @param {Object} root current iteration item
 * @return {Boolean} if false, item will be filtered out
 *
 * @author Kir Belevich
 */
exports.fn = function (root) {
  const regEnableBackground = /^new\s0\s0\s([-+]?\d*\.?\d+([eE][-+]?\d+)?)\s([-+]?\d*\.?\d+([eE][-+]?\d+)?)$/;
  let hasFilter = false;
  const elems = ['svg', 'mask', 'pattern'];

  traverse(root, (node) => {
    if (node.type === 'element') {
      if (
        elems.includes(node.name) &&
        node.attributes['enable-background'] != null &&
        node.attributes.width != null &&
        node.attributes.height != null
      ) {
        const match = node.attributes['enable-background'].match(
          regEnableBackground
        );

        if (match) {
          if (
            node.attributes.width === match[1] &&
            node.attributes.height === match[3]
          ) {
            if (node.name === 'svg') {
              delete node.attributes['enable-background'];
            } else {
              node.attributes['enable-background'] = 'new';
            }
          }
        }
      }
      if (node.name === 'filter') {
        hasFilter = true;
      }
    }
  });

  if (hasFilter === false) {
    traverse(root, (node) => {
      if (node.type === 'element') {
        //we don't need 'enable-background' if we have no filters
        delete node.attributes['enable-background'];
      }
    });
  }

  return root;
};
