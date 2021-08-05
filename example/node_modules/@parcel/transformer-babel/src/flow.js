// @flow

import type {Config, PluginOptions, PackageJSON} from '@parcel/types';
import type {BabelConfig} from './types';

/**
 * Generates a babel config for stripping away Flow types.
 */
export default async function getFlowOptions(
  config: Config,
  options: PluginOptions,
): Promise<?BabelConfig> {
  if (!config.isSource) {
    return null;
  }

  // Only add flow plugin if `flow-bin` is listed as a dependency in the root package.json
  let conf = await config.getConfigFrom<PackageJSON>(
    options.projectRoot + '/index',
    ['package.json'],
  );
  let pkg = conf?.contents;
  if (
    !pkg ||
    (!(pkg.dependencies && pkg.dependencies['flow-bin']) &&
      !(pkg.devDependencies && pkg.devDependencies['flow-bin']))
  ) {
    return null;
  }

  return {
    plugins: [
      ['@babel/plugin-transform-flow-strip-types', {requireDirective: true}],
    ],
  };
}
