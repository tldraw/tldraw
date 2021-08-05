'use strict';
var $ = require('../internals/export');
var toObject = require('../internals/to-object');
var toLength = require('../internals/to-length');
var toInteger = require('../internals/to-integer');
var addToUnscopables = require('../internals/add-to-unscopables');

// `Array.prototype.at` method
// https://github.com/tc39/proposal-relative-indexing-method
$({ target: 'Array', proto: true }, {
  at: function at(index) {
    var O = toObject(this);
    var len = toLength(O.length);
    var relativeIndex = toInteger(index);
    var k = relativeIndex >= 0 ? relativeIndex : len + relativeIndex;
    return (k < 0 || k >= len) ? undefined : O[k];
  }
});

addToUnscopables('at');
