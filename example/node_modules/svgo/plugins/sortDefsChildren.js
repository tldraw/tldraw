'use strict';

exports.type = 'perItem';

exports.active = true;

exports.description = 'Sorts children of <defs> to improve compression';

/**
 * Sorts children of defs in order to improve compression.
 * Sorted first by frequency then by element name length then by element name (to ensure grouping).
 *
 * @param {Object} item current iteration item
 * @return {Boolean} if false, item will be filtered out
 *
 * @author David Leston
 */
exports.fn = function (item) {
  if (item.isElem('defs')) {
    var frequency = item.children.reduce(function (frequency, child) {
      if (child.name in frequency) {
        frequency[child.name]++;
      } else {
        frequency[child.name] = 1;
      }
      return frequency;
    }, {});
    item.children.sort(function (a, b) {
      var frequencyComparison = frequency[b.name] - frequency[a.name];
      if (frequencyComparison !== 0) {
        return frequencyComparison;
      }
      var lengthComparison = b.name.length - a.name.length;
      if (lengthComparison !== 0) {
        return lengthComparison;
      }
      return a.name != b.name ? (a.name > b.name ? -1 : 1) : 0;
    });
    return true;
  }
};
