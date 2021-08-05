// TODO: Remove from `core-js@4`
var filterOut = require('../array/virtual/filter-out');

var ArrayPrototype = Array.prototype;

module.exports = function (it) {
  var own = it.filterOut;
  return it === ArrayPrototype || (it instanceof Array && own === ArrayPrototype.filterOut) ? filterOut : own;
};
