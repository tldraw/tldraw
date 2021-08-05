'use strict';

/**
 * Encode plain SVG data string into Data URI string.
 *
 * @param {string} str input string
 * @param {string} type Data URI type
 * @return {string} output string
 */
exports.encodeSVGDatauri = function (str, type) {
  var prefix = 'data:image/svg+xml';
  if (!type || type === 'base64') {
    // base64
    prefix += ';base64,';
    str = prefix + Buffer.from(str).toString('base64');
  } else if (type === 'enc') {
    // URI encoded
    str = prefix + ',' + encodeURIComponent(str);
  } else if (type === 'unenc') {
    // unencoded
    str = prefix + ',' + str;
  }
  return str;
};

/**
 * Decode SVG Data URI string into plain SVG string.
 *
 * @param {string} str input string
 * @return {string} output string
 */
exports.decodeSVGDatauri = function (str) {
  var regexp = /data:image\/svg\+xml(;charset=[^;,]*)?(;base64)?,(.*)/;
  var match = regexp.exec(str);

  // plain string
  if (!match) return str;

  var data = match[3];

  if (match[2]) {
    // base64
    str = Buffer.from(data, 'base64').toString('utf8');
  } else if (data.charAt(0) === '%') {
    // URI encoded
    str = decodeURIComponent(data);
  } else if (data.charAt(0) === '<') {
    // unencoded
    str = data;
  }
  return str;
};

/**
 * @param {any[]} a
 * @param {any[]} b
 */
exports.intersectArrays = function (a, b) {
  return a.filter(function (n) {
    return b.indexOf(n) > -1;
  });
};

/**
 * Convert a row of numbers to an optimized string view.
 *
 * @example
 * [0, -1, .5, .5] → "0-1 .5.5"
 *
 * @param {number[]} data
 * @param {Object} params
 * @param {string} [command] path data instruction
 * @return {string}
 */
exports.cleanupOutData = function (data, params, command) {
  var str = '',
    delimiter,
    prev;

  data.forEach(function (item, i) {
    // space delimiter by default
    delimiter = ' ';

    // no extra space in front of first number
    if (i == 0) delimiter = '';

    // no extra space after 'arcto' command flags(large-arc and sweep flags)
    // a20 60 45 0 1 30 20 → a20 60 45 0130 20
    if (params.noSpaceAfterFlags && (command == 'A' || command == 'a')) {
      var pos = i % 7;
      if (pos == 4 || pos == 5) delimiter = '';
    }

    // remove floating-point numbers leading zeros
    // 0.5 → .5
    // -0.5 → -.5
    const itemStr = params.leadingZero
      ? removeLeadingZero(item)
      : item.toString();

    // no extra space in front of negative number or
    // in front of a floating number if a previous number is floating too
    if (
      params.negativeExtraSpace &&
      delimiter != '' &&
      (item < 0 || (itemStr.charAt(0) === '.' && prev % 1 !== 0))
    ) {
      delimiter = '';
    }
    // save prev item value
    prev = item;
    str += delimiter + itemStr;
  });
  return str;
};

/**
 * Remove floating-point numbers leading zero.
 *
 * @example
 * 0.5 → .5
 *
 * @example
 * -0.5 → -.5
 *
 * @param {number} num input number
 *
 * @return {string} output number as string
 */
var removeLeadingZero = function (num) {
  var strNum = num.toString();

  if (0 < num && num < 1 && strNum.charAt(0) === '0') {
    strNum = strNum.slice(1);
  } else if (-1 < num && num < 0 && strNum.charAt(1) === '0') {
    strNum = strNum.charAt(0) + strNum.slice(2);
  }
  return strNum;
};
exports.removeLeadingZero = removeLeadingZero;

const parseName = (name) => {
  if (name == null) {
    return {
      prefix: '',
      local: '',
    };
  }
  if (name === 'xmlns') {
    return {
      prefix: 'xmlns',
      local: '',
    };
  }
  const chunks = name.split(':');
  if (chunks.length === 1) {
    return {
      prefix: '',
      local: chunks[0],
    };
  }
  return {
    prefix: chunks[0],
    local: chunks[1],
  };
};
exports.parseName = parseName;
