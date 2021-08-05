var uniqueBy = require('../array/virtual/unique-by');

var ArrayPrototype = Array.prototype;

module.exports = function (it) {
  var own = it.uniqueBy;
  return it === ArrayPrototype || (it instanceof Array && own === ArrayPrototype.uniqueBy) ? uniqueBy : own;
};
