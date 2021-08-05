require('../../modules/es.json.stringify');
var core = require('../../internals/path');

// eslint-disable-next-line es/no-json -- safe
if (!core.JSON) core.JSON = { stringify: JSON.stringify };

// eslint-disable-next-line no-unused-vars -- required for `.length`
module.exports = function stringify(it, replacer, space) {
  return core.JSON.stringify.apply(null, arguments);
};
