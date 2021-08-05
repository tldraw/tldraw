'use strict';
var $ = require('../internals/export');
var IS_PURE = require('../internals/is-pure');
var $emplace = require('../internals/map-emplace');

// `WeakMap.prototype.emplace` method
// https://github.com/tc39/proposal-upsert
$({ target: 'WeakMap', proto: true, real: true, forced: IS_PURE }, {
  emplace: $emplace
});
