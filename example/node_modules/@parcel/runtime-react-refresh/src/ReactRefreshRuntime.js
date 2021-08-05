// @flow strict-local

import {Runtime} from '@parcel/plugin';
import {loadConfig} from '@parcel/utils';

const CODE = `
var Refresh = require('react-refresh/runtime');

Refresh.injectIntoGlobalHook(window);
window.$RefreshReg$ = function() {};
window.$RefreshSig$ = function() {
  return function(type) {
    return type;
  };
};`;

export default (new Runtime({
  async apply({bundle, options}) {
    if (
      bundle.type !== 'js' ||
      !options.hmrOptions ||
      !bundle.env.isBrowser() ||
      bundle.env.isWorker() ||
      bundle.env.isWorklet() ||
      options.mode !== 'development' ||
      bundle.env.sourceType !== 'module'
    ) {
      return;
    }

    let entries = bundle.getEntryAssets();
    for (let entry of entries) {
      // TODO: do this in loadConfig - but it doesn't have access to the bundle...
      let pkg = await loadConfig(
        options.inputFS,
        entry.filePath,
        ['package.json'],
        options.projectRoot,
      );
      if (
        pkg?.config?.dependencies?.react ||
        pkg?.config?.devDependencies?.react ||
        pkg?.config?.peerDependencies?.react
      ) {
        return {
          filePath: __filename,
          code: CODE,
          isEntry: true,
        };
      }
    }
  },
}): Runtime);
