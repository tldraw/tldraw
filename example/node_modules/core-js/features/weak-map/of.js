'use strict';
require('../../modules/es.array.iterator');
require('../../modules/es.weak-map');
require('../../modules/esnext.weak-map.of');
var path = require('../../internals/path');

var WeakMap = path.WeakMap;
var weakMapOf = WeakMap.of;

module.exports = function of() {
  return weakMapOf.apply(typeof this === 'function' ? this : WeakMap, arguments);
};
