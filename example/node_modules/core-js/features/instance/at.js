var arrayAt = require('../array/virtual/at');
var stringAt = require('../string/virtual/at');

var ArrayPrototype = Array.prototype;
var StringPrototype = String.prototype;

module.exports = function (it) {
  var own = it.at;
  if (it === ArrayPrototype || (it instanceof Array && own === ArrayPrototype.at)) return arrayAt;
  if (typeof it === 'string' || it === StringPrototype || (it instanceof String && own === StringPrototype.at)) {
    return stringAt;
  } return own;
};
