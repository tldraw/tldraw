'use strict';

exports.type = 'perItem';

exports.active = true;

exports.description = 'removes XML processing instructions';

/**
 * Remove XML Processing Instruction.
 *
 * @example
 * <?xml version="1.0" encoding="utf-8"?>
 *
 * @param {Object} item current iteration item
 * @return {Boolean} if false, item will be filtered out
 *
 * @author Kir Belevich
 */
exports.fn = function (item) {
  if (item.type === 'instruction' && item.name === 'xml') {
    return false;
  }
  return true;
};
