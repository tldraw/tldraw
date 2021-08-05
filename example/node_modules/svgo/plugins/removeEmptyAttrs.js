'use strict';

const { attrsGroups } = require('./_collections.js');

exports.type = 'perItem';

exports.active = true;

exports.description = 'removes empty attributes';

/**
 * Remove attributes with empty values.
 *
 * @param {Object} item current iteration item
 * @return {Boolean} if false, item will be filtered out
 *
 * @author Kir Belevich
 */
exports.fn = function (item) {
  if (item.type === 'element') {
    for (const [name, value] of Object.entries(item.attributes)) {
      if (
        value === '' &&
        // empty conditional processing attributes prevents elements from rendering
        attrsGroups.conditionalProcessing.includes(name) === false
      ) {
        delete item.attributes[name];
      }
    }
  }
};
