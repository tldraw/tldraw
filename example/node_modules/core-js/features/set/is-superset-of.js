require('../../modules/es.array.iterator');
require('../../modules/es.set');
require('../../modules/es.string.iterator');
require('../../modules/esnext.set.is-superset-of');
require('../../modules/web.dom-collections.iterator');
var entryUnbind = require('../../internals/entry-unbind');

module.exports = entryUnbind('Set', 'isSupersetOf');
