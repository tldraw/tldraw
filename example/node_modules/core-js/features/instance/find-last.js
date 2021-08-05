var findLast = require('../array/virtual/find-last');

var ArrayPrototype = Array.prototype;

module.exports = function (it) {
  var own = it.findLast;
  return it === ArrayPrototype || (it instanceof Array && own === ArrayPrototype.findLast) ? findLast : own;
};
