'use strict';
var $ = require('../internals/export');
var IS_PURE = require('../internals/is-pure');
var $emplace = require('../internals/map-emplace');

// `Map.prototype.emplace` method
// https://github.com/thumbsupep/proposal-upsert
$({ target: 'Map', proto: true, real: true, forced: IS_PURE }, {
  emplace: $emplace
});
