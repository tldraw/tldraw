// @flow

import {Resolver} from '@parcel/plugin';
import NodeResolver from '@parcel/node-resolver-core';

// Throw user friendly errors on special webpack loader syntax
// ex. `imports-loader?$=jquery!./example.js`
const WEBPACK_IMPORT_REGEX = /\S+-loader\S*!\S+/g;

export default (new Resolver({
  resolve({dependency, options, filePath}) {
    if (WEBPACK_IMPORT_REGEX.test(dependency.specifier)) {
      throw new Error(
        `The import path: ${dependency.specifier} is using webpack specific loader import syntax, which isn't supported by Parcel.`,
      );
    }

    const resolver = new NodeResolver({
      fs: options.inputFS,
      projectRoot: options.projectRoot,
      extensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'css', 'styl', 'vue'],
      mainFields: ['source', 'browser', 'module', 'main'],
    });

    return resolver.resolve({
      filename: filePath,
      isURL: dependency.specifierType === 'url',
      parent: dependency.resolveFrom,
      env: dependency.env,
      sourcePath: dependency.sourcePath,
    });
  },
}): Resolver);
