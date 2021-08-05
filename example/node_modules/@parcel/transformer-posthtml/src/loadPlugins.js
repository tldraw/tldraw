// @flow

import type {FilePath, PluginOptions} from '@parcel/types';
import type {PackageManager} from '@parcel/package-manager';

export default async function loadExternalPlugins(
  plugins: Array<string> | {+[pluginName: string]: mixed, ...},
  relative: FilePath,
  options: PluginOptions,
): Promise<Array<mixed>> {
  if (Array.isArray(plugins)) {
    return Promise.all(
      plugins
        .map(p =>
          loadPlugin(
            p,
            relative,
            null,
            options.packageManager,
            options.shouldAutoInstall,
          ),
        )
        .filter(Boolean),
    );
  } else if (typeof plugins === 'object') {
    let _plugins = plugins;
    let mapPlugins = await Promise.all(
      Object.keys(plugins).map(p =>
        loadPlugin(
          p,
          relative,
          _plugins[p],
          options.packageManager,
          options.shouldAutoInstall,
        ),
      ),
    );
    return mapPlugins.filter(Boolean);
  } else {
    return [];
  }
}

async function loadPlugin(
  pluginArg: string | Function,
  relative: FilePath,
  options: mixed = {},
  packageManager: PackageManager,
  shouldAutoInstall: boolean,
): mixed {
  if (typeof pluginArg !== 'string') {
    return pluginArg;
  }

  let plugin = await packageManager.require(pluginArg, relative, {
    shouldAutoInstall,
  });

  plugin = plugin.default || plugin;

  return plugin(options);
}
