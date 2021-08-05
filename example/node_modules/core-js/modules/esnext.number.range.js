'use strict';
var $ = require('../internals/export');
var NumericRangeIterator = require('../internals/numeric-range-iterator');

// `Number.range` method
// https://github.com/tc39/proposal-Number.range
$({ target: 'Number', stat: true }, {
  range: function range(start, end, option) {
    return new NumericRangeIterator(start, end, option, 'number', 0, 1);
  }
});
