// TODO: disabled by default because of the conflict with another proposal
'use strict';
var $ = require('../internals/export');
var requireObjectCoercible = require('../internals/require-object-coercible');
var toInteger = require('../internals/to-integer');
var toLength = require('../internals/to-length');
var toString = require('../internals/to-string');
var fails = require('../internals/fails');

var FORCED = fails(function () {
  return '𠮷'.at(0) !== '\uD842';
});

// `String.prototype.at` method
// https://github.com/tc39/proposal-relative-indexing-method
$({ target: 'String', proto: true, forced: FORCED }, {
  at: function at(index) {
    var S = toString(requireObjectCoercible(this));
    var len = toLength(S.length);
    var relativeIndex = toInteger(index);
    var k = relativeIndex >= 0 ? relativeIndex : len + relativeIndex;
    return (k < 0 || k >= len) ? undefined : S.charAt(k);
  }
});
