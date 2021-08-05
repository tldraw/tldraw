'use strict';
require('../../modules/es.array.iterator');
require('../../modules/es.map');
require('../../modules/esnext.map.of');
var path = require('../../internals/path');

var Map = path.Map;
var mapOf = Map.of;

module.exports = function of() {
  return mapOf.apply(typeof this === 'function' ? this : Map, arguments);
};
