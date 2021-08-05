'use strict';
var $ = require('../internals/export');
var charAt = require('../internals/string-multibyte').charAt;
var fails = require('../internals/fails');

var FORCED = fails(function () {
  return '𠮷'.at(0) !== '𠮷';
});

// `String.prototype.at` method
// https://github.com/mathiasbynens/String.prototype.at
$({ target: 'String', proto: true, forced: FORCED }, {
  at: function at(pos) {
    return charAt(this, pos);
  }
});
