require('ts-node/register');
module.exports = require('./internal/scripts/lib/eslint-plugin.ts').default || require('./internal/scripts/lib/eslint-plugin.ts');

