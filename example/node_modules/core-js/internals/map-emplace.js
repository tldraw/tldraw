'use strict';
var anObject = require('../internals/an-object');

// `Map.prototype.emplace` method
// https://github.com/thumbsupep/proposal-upsert
module.exports = function emplace(key, handler) {
  var map = anObject(this);
  var value = (map.has(key) && 'update' in handler)
    ? handler.update(map.get(key), key, map)
    : handler.insert(key, map);
  map.set(key, value);
  return value;
};
