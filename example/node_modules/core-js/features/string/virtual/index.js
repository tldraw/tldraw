var parent = require('../../../es/string/virtual');
require('../../../modules/esnext.string.at');
// TODO: disabled by default because of the conflict with another proposal
// require('../../../modules/esnext.string.at-alternative');
require('../../../modules/esnext.string.code-points');
// TODO: remove from `core-js@4`
require('../../../modules/esnext.string.match-all');
require('../../../modules/esnext.string.replace-all');

module.exports = parent;
