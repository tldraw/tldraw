// @flow strict-local

import type {Config, PluginOptions} from '@parcel/types';

import path from 'path';

const JSX_EXTENSIONS = new Set(['.jsx', '.tsx']);
const JSX_LIBRARIES = ['react', 'preact', 'nervejs', 'hyperapp'];

/**
 * Returns whether an asset is likely JSX. Attempts to detect react or react-like libraries
 * along with
 */
export default async function isJSX(
  options: PluginOptions,
  config: Config,
): Promise<boolean> {
  if (!config.isSource) {
    return false;
  }

  if (JSX_EXTENSIONS.has(path.extname(config.searchPath))) {
    return true;
  }

  let pkg = await config.getPackage();
  if (pkg?.alias && pkg.alias['react']) {
    // e.g.: `{ alias: { "react": "preact/compat" } }`
    return true;
  } else {
    // Find a dependency that implies JSX syntax.
    return JSX_LIBRARIES.some(
      libName =>
        pkg &&
        ((pkg.dependencies && pkg.dependencies[libName]) ||
          (pkg.devDependencies && pkg.devDependencies[libName]) ||
          (pkg.peerDependencies && pkg.peerDependencies[libName])),
    );
  }
}
