"use strict";

exports.__esModule = true;
exports.default = unesc;
var whitespace = '[\\x20\\t\\r\\n\\f]';
var unescapeRegExp = new RegExp('\\\\([\\da-f]{1,6}' + whitespace + '?|(' + whitespace + ')|.)', 'ig');

function unesc(str) {
  return str.replace(unescapeRegExp, function (_, escaped, escapedWhitespace) {
    var high = '0x' + escaped - 0x10000; // NaN means non-codepoint
    // Workaround erroneous numeric interpretation of +"0x"
    // eslint-disable-next-line no-self-compare

    return high !== high || escapedWhitespace ? escaped : high < 0 ? // BMP codepoint
    String.fromCharCode(high + 0x10000) : // Supplemental Plane codepoint (surrogate pair)
    String.fromCharCode(high >> 10 | 0xd800, high & 0x3ff | 0xdc00);
  });
}

module.exports = exports.default;