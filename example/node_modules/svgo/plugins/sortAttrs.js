'use strict';

const { parseName } = require('../lib/svgo/tools.js');

exports.type = 'perItem';

exports.active = false;

exports.description = 'sorts element attributes (disabled by default)';

exports.params = {
  order: [
    'id',
    'width',
    'height',
    'x',
    'x1',
    'x2',
    'y',
    'y1',
    'y2',
    'cx',
    'cy',
    'r',
    'fill',
    'stroke',
    'marker',
    'd',
    'points',
  ],
};

/**
 * Sort element attributes for epic readability.
 *
 * @param {Object} item current iteration item
 * @param {Object} params plugin params
 *
 * @author Nikolay Frantsev
 */
exports.fn = function (item, params) {
  const orderlen = params.order.length + 1;
  const xmlnsOrder = params.xmlnsOrder || 'front';

  if (item.type === 'element') {
    const attrs = Object.entries(item.attributes);

    attrs.sort(([aName], [bName]) => {
      const { prefix: aPrefix } = parseName(aName);
      const { prefix: bPrefix } = parseName(bName);
      if (aPrefix != bPrefix) {
        // xmlns attributes implicitly have the prefix xmlns
        if (xmlnsOrder == 'front') {
          if (aPrefix === 'xmlns') return -1;
          if (bPrefix === 'xmlns') return 1;
        }
        return aPrefix < bPrefix ? -1 : 1;
      }

      let aindex = orderlen;
      let bindex = orderlen;

      for (let i = 0; i < params.order.length; i++) {
        if (aName == params.order[i]) {
          aindex = i;
        } else if (aName.indexOf(params.order[i] + '-') === 0) {
          aindex = i + 0.5;
        }
        if (bName == params.order[i]) {
          bindex = i;
        } else if (bName.indexOf(params.order[i] + '-') === 0) {
          bindex = i + 0.5;
        }
      }

      if (aindex != bindex) {
        return aindex - bindex;
      }
      return aName < bName ? -1 : 1;
    });

    const sorted = {};
    for (const [name, value] of attrs) {
      sorted[name] = value;
    }
    item.attributes = sorted;
  }
};
