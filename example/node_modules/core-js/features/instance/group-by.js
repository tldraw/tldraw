var groupBy = require('../array/virtual/group-by');

var ArrayPrototype = Array.prototype;

module.exports = function (it) {
  var own = it.groupBy;
  return it === ArrayPrototype || (it instanceof Array && own === ArrayPrototype.groupBy) ? groupBy : own;
};
