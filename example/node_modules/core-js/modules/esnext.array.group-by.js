'use strict';
var $ = require('../internals/export');
var $groupBy = require('../internals/array-group-by');
var arraySpeciesConstructor = require('../internals/array-species-constructor');
var addToUnscopables = require('../internals/add-to-unscopables');

// `Array.prototype.groupBy` method
// https://github.com/tc39/proposal-array-grouping
$({ target: 'Array', proto: true }, {
  groupBy: function groupBy(callbackfn /* , thisArg */) {
    var thisArg = arguments.length > 1 ? arguments[1] : undefined;
    return $groupBy(this, callbackfn, thisArg, arraySpeciesConstructor);
  }
});

addToUnscopables('groupBy');
