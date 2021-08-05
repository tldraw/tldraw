var $ = require('../internals/export');
var hasOwn = require('../internals/has');

// `Object.hasOwn` method
// https://github.com/tc39/proposal-accessible-object-hasownproperty
$({ target: 'Object', stat: true }, {
  hasOwn: hasOwn
});
