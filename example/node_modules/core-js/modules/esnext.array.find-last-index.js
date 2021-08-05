'use strict';
var $ = require('../internals/export');
var $findLastIndex = require('../internals/array-iteration-from-last').findLastIndex;
var addToUnscopables = require('../internals/add-to-unscopables');

// `Array.prototype.findLastIndex` method
// https://github.com/tc39/proposal-array-find-from-last
$({ target: 'Array', proto: true }, {
  findLastIndex: function findLastIndex(callbackfn /* , that = undefined */) {
    return $findLastIndex(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
  }
});

addToUnscopables('findLastIndex');
