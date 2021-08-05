var findLastIndex = require('../array/virtual/find-last-index');

var ArrayPrototype = Array.prototype;

module.exports = function (it) {
  var own = it.findLastIndex;
  return it === ArrayPrototype || (it instanceof Array && own === ArrayPrototype.findLastIndex) ? findLastIndex : own;
};
