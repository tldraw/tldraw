'use strict';

exports.type = 'perItem';

exports.active = true;

exports.description =
  'rounds numeric values to the fixed precision, removes default ‘px’ units';

exports.params = {
  floatPrecision: 3,
  leadingZero: true,
  defaultPx: true,
  convertToPx: true,
};

var regNumericValues = /^([-+]?\d*\.?\d+([eE][-+]?\d+)?)(px|pt|pc|mm|cm|m|in|ft|em|ex|%)?$/,
  removeLeadingZero = require('../lib/svgo/tools').removeLeadingZero,
  absoluteLengths = {
    // relative to px
    cm: 96 / 2.54,
    mm: 96 / 25.4,
    in: 96,
    pt: 4 / 3,
    pc: 16,
  };

/**
 * Round numeric values to the fixed precision,
 * remove default 'px' units.
 *
 * @param {Object} item current iteration item
 * @param {Object} params plugin params
 * @return {Boolean} if false, item will be filtered out
 *
 * @author Kir Belevich
 */
exports.fn = function (item, params) {
  if (item.type === 'element') {
    var floatPrecision = params.floatPrecision;

    if (item.attributes.viewBox != null) {
      var nums = item.attributes.viewBox.split(/\s,?\s*|,\s*/g);
      item.attributes.viewBox = nums
        .map(function (value) {
          var num = +value;
          return isNaN(num) ? value : +num.toFixed(floatPrecision);
        })
        .join(' ');
    }

    for (const [name, value] of Object.entries(item.attributes)) {
      // The `version` attribute is a text string and cannot be rounded
      if (name === 'version') {
        continue;
      }

      var match = value.match(regNumericValues);

      // if attribute value matches regNumericValues
      if (match) {
        // round it to the fixed precision
        var num = +(+match[1]).toFixed(floatPrecision),
          units = match[3] || '';

        // convert absolute values to pixels
        if (params.convertToPx && units && units in absoluteLengths) {
          var pxNum = +(absoluteLengths[units] * match[1]).toFixed(
            floatPrecision
          );

          if (String(pxNum).length < match[0].length) {
            num = pxNum;
            units = 'px';
          }
        }

        // and remove leading zero
        if (params.leadingZero) {
          num = removeLeadingZero(num);
        }

        // remove default 'px' units
        if (params.defaultPx && units === 'px') {
          units = '';
        }

        item.attributes[name] = num + units;
      }
    }
  }
};
