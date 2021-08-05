// @flow
import type {
  Config,
  FilePath,
  PluginOptions,
  PluginLogger,
} from '@parcel/types';
import path from 'path';
import {relativePath} from '@parcel/utils';
import nullthrows from 'nullthrows';
import clone from 'clone';
import {POSTCSS_RANGE} from './constants';

import loadExternalPlugins from './loadPlugins';

const MODULE_BY_NAME_RE = /\.module\./;

type ConfigResult = {|
  raw: any,
  hydrated: {|
    plugins: Array<any>,
    from: FilePath,
    to: FilePath,
    modules: any,
  |},
|};

async function configHydrator(
  configFile: any,
  config: Config,
  resolveFrom: ?FilePath,
  options: PluginOptions,
): Promise<?ConfigResult> {
  // Use a basic, modules-only PostCSS config if the file opts in by a name
  // like foo.module.css
  if (configFile == null && config.searchPath.match(MODULE_BY_NAME_RE)) {
    configFile = {
      plugins: {
        'postcss-modules': {},
      },
    };
    resolveFrom = __filename;
  }

  if (configFile == null) {
    return;
  }

  // Load the custom config...
  let modulesConfig;
  let configFilePlugins = clone(configFile.plugins);
  if (
    configFilePlugins != null &&
    typeof configFilePlugins === 'object' &&
    configFilePlugins['postcss-modules'] != null
  ) {
    modulesConfig = configFilePlugins['postcss-modules'];
    delete configFilePlugins['postcss-modules'];
  }

  if (!modulesConfig && configFile.modules) {
    modulesConfig = {};
  }

  let plugins = await loadExternalPlugins(
    configFilePlugins,
    nullthrows(resolveFrom),
    options,
  );

  // contents is either:
  // from JSON:    { plugins: { 'postcss-foo': { ...opts } } }
  // from JS (v8): { plugins: [ { postcssPlugin: 'postcss-foo', ...visitor callback functions } ]
  // from JS (v7): { plugins: [ [Function: ...] ]
  let pluginArray = Array.isArray(configFilePlugins)
    ? configFilePlugins
    : Object.keys(configFilePlugins);
  for (let p of pluginArray) {
    if (typeof p === 'string') {
      config.addDevDependency({
        specifier: p,
        resolveFrom: nullthrows(resolveFrom),
      });
    }
  }

  return {
    raw: configFile,
    hydrated: {
      plugins,
      from: config.searchPath,
      to: config.searchPath,
      modules: modulesConfig,
    },
  };
}

export async function load({
  config,
  options,
  logger,
}: {|
  config: Config,
  options: PluginOptions,
  logger: PluginLogger,
|}): Promise<?ConfigResult> {
  let configFile: any = await config.getConfig(
    ['.postcssrc', '.postcssrc.json', '.postcssrc.js', 'postcss.config.js'],
    {packageKey: 'postcss'},
  );

  let contents = null;
  if (configFile) {
    config.addDevDependency({
      specifier: 'postcss',
      resolveFrom: config.searchPath,
      range: POSTCSS_RANGE,
    });

    contents = configFile.contents;
    let isDynamic = configFile && path.extname(configFile.filePath) === '.js';
    if (isDynamic) {
      // We have to invalidate on startup in case the config is non-deterministic,
      // e.g. using unknown environment variables, reading from the filesystem, etc.
      logger.warn({
        message:
          'WARNING: Using a JavaScript PostCSS config file means losing out on caching features of Parcel. Use a .postcssrc(.json) file whenever possible.',
      });

      config.invalidateOnStartup();

      // Also add the config as a dev dependency so we attempt to reload in watch mode.
      config.addDevDependency({
        specifier: relativePath(
          path.dirname(config.searchPath),
          configFile.filePath,
        ),
        resolveFrom: config.searchPath,
      });
    }

    if (typeof contents !== 'object') {
      throw new Error('PostCSS config should be an object.');
    }

    if (
      contents.plugins == null ||
      typeof contents.plugins !== 'object' ||
      Object.keys(contents.plugins).length === 0
    ) {
      throw new Error('PostCSS config must have plugins');
    }
  }

  return configHydrator(contents, config, configFile?.filePath, options);
}
