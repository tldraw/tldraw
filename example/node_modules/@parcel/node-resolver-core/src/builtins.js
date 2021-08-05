// @flow
import polyfills from '@parcel/node-libs-browser';
// $FlowFixMe this is untyped
import {builtinModules} from 'module';

export const empty: string = require.resolve('./_empty.js');

// $FlowFixMe
let builtins: {[string]: any, ...} = Object.create(null);
// use definite (current) list of Node builtins
for (let key of builtinModules) {
  builtins[key] = empty;
}
// load the polyfill where available
for (let key in polyfills) {
  builtins[key] = polyfills[key] || empty;
}

export default builtins;
