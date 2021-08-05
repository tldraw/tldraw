var getBuiltIn = require('../internals/get-built-in');
var USE_SYMBOL_AS_UID = require('../internals/use-symbol-as-uid');

module.exports = USE_SYMBOL_AS_UID ? function (it) {
  return typeof it == 'symbol';
} : function (it) {
  var $Symbol = getBuiltIn('Symbol');
  return typeof $Symbol == 'function' && Object(it) instanceof $Symbol;
};
