var filterReject = require('../array/virtual/filter-reject');

var ArrayPrototype = Array.prototype;

module.exports = function (it) {
  var own = it.filterReject;
  return it === ArrayPrototype || (it instanceof Array && own === ArrayPrototype.filterReject) ? filterReject : own;
};
