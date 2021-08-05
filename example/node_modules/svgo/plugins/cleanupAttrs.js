'use strict';

exports.type = 'perItem';

exports.active = true;

exports.description =
  'cleanups attributes from newlines, trailing and repeating spaces';

exports.params = {
  newlines: true,
  trim: true,
  spaces: true,
};

var regNewlinesNeedSpace = /(\S)\r?\n(\S)/g,
  regNewlines = /\r?\n/g,
  regSpaces = /\s{2,}/g;

/**
 * Cleanup attributes values from newlines, trailing and repeating spaces.
 *
 * @param {Object} item current iteration item
 * @param {Object} params plugin params
 * @return {Boolean} if false, item will be filtered out
 *
 * @author Kir Belevich
 */
exports.fn = function (item, params) {
  if (item.type === 'element') {
    for (const name of Object.keys(item.attributes)) {
      if (params.newlines) {
        // new line which requires a space instead of themselve
        item.attributes[name] = item.attributes[name].replace(
          regNewlinesNeedSpace,
          (match, p1, p2) => p1 + ' ' + p2
        );

        // simple new line
        item.attributes[name] = item.attributes[name].replace(regNewlines, '');
      }

      if (params.trim) {
        item.attributes[name] = item.attributes[name].trim();
      }

      if (params.spaces) {
        item.attributes[name] = item.attributes[name].replace(regSpaces, ' ');
      }
    }
  }
};
