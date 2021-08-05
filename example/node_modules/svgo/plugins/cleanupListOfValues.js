'use strict';

const { removeLeadingZero } = require('../lib/svgo/tools.js');

exports.type = 'perItem';

exports.active = false;

exports.description = 'rounds list of values to the fixed precision';

exports.params = {
  floatPrecision: 3,
  leadingZero: true,
  defaultPx: true,
  convertToPx: true,
};

const regNumericValues = /^([-+]?\d*\.?\d+([eE][-+]?\d+)?)(px|pt|pc|mm|cm|m|in|ft|em|ex|%)?$/;
const regSeparator = /\s+,?\s*|,\s*/;
const absoluteLengths = {
  // relative to px
  cm: 96 / 2.54,
  mm: 96 / 25.4,
  in: 96,
  pt: 4 / 3,
  pc: 16,
};

/**
 * Round list of values to the fixed precision.
 *
 * @example
 * <svg viewBox="0 0 200.28423 200.28423" enable-background="new 0 0 200.28423 200.28423">
 *         ⬇
 * <svg viewBox="0 0 200.284 200.284" enable-background="new 0 0 200.284 200.284">
 *
 *
 * <polygon points="208.250977 77.1308594 223.069336 ... "/>
 *         ⬇
 * <polygon points="208.251 77.131 223.069 ... "/>
 *
 *
 * @param {Object} item current iteration item
 * @param {Object} params plugin params
 * @return {Boolean} if false, item will be filtered out
 *
 * @author kiyopikko
 */
exports.fn = function (item, params) {
  if (item.type !== 'element') {
    return;
  }

  if (item.attributes.points != null) {
    item.attributes.points = roundValues(item.attributes.points);
  }

  if (item.attributes['enable-background'] != null) {
    item.attributes['enable-background'] = roundValues(
      item.attributes['enable-background']
    );
  }

  if (item.attributes.viewBox != null) {
    item.attributes.viewBox = roundValues(item.attributes.viewBox);
  }

  if (item.attributes['stroke-dasharray'] != null) {
    item.attributes['stroke-dasharray'] = roundValues(
      item.attributes['stroke-dasharray']
    );
  }

  if (item.attributes.dx != null) {
    item.attributes.dx = roundValues(item.attributes.dx);
  }

  if (item.attributes.dy != null) {
    item.attributes.dy = roundValues(item.attributes.dy);
  }

  if (item.attributes.x != null) {
    item.attributes.x = roundValues(item.attributes.x);
  }

  if (item.attributes.y != null) {
    item.attributes.y = roundValues(item.attributes.y);
  }

  function roundValues(lists) {
    var num,
      units,
      match,
      matchNew,
      listsArr = lists.split(regSeparator),
      roundedList = [];

    for (const elem of listsArr) {
      match = elem.match(regNumericValues);
      matchNew = elem.match(/new/);

      // if attribute value matches regNumericValues
      if (match) {
        // round it to the fixed precision
        (num = +(+match[1]).toFixed(params.floatPrecision)),
          (units = match[3] || '');

        // convert absolute values to pixels
        if (params.convertToPx && units && units in absoluteLengths) {
          var pxNum = +(absoluteLengths[units] * match[1]).toFixed(
            params.floatPrecision
          );

          if (String(pxNum).length < match[0].length)
            (num = pxNum), (units = 'px');
        }

        // and remove leading zero
        if (params.leadingZero) {
          num = removeLeadingZero(num);
        }

        // remove default 'px' units
        if (params.defaultPx && units === 'px') {
          units = '';
        }

        roundedList.push(num + units);
      }
      // if attribute value is "new"(only enable-background).
      else if (matchNew) {
        roundedList.push('new');
      } else if (elem) {
        roundedList.push(elem);
      }
    }

    return roundedList.join(' ');
  }
};
