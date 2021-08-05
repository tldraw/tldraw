// @flow

import type {Config, PluginOptions, PluginLogger} from '@parcel/types';
import typeof * as BabelCore from '@babel/core';
import type {BabelConfig} from './types';

import path from 'path';
import * as internalBabelCore from '@babel/core';
import {hashObject, relativePath, resolveConfig} from '@parcel/utils';

import isJSX from './jsx';
import getFlowOptions from './flow';
import {enginesToBabelTargets} from './utils';

const TYPESCRIPT_EXTNAME_RE = /\.tsx?$/;
const BABEL_TRANSFORMER_DIR = path.dirname(__dirname);
const JS_EXTNAME_RE = /^\.(js|cjs|mjs)$/;
const BABEL_CONFIG_FILENAMES = [
  '.babelrc',
  '.babelrc.js',
  '.babelrc.json',
  '.babelrc.cjs',
  '.babelrc.mjs',
  '.babelignore',
  'babel.config.js',
  'babel.config.json',
  'babel.config.mjs',
  'babel.config.cjs',
];

const BABEL_CORE_RANGE = '^7.12.0';

type BabelConfigResult = {|
  internal: boolean,
  config: BabelConfig,
  targets?: mixed,
  syntaxPlugins?: mixed,
|};

export async function load(
  config: Config,
  options: PluginOptions,
  logger: PluginLogger,
): Promise<?BabelConfigResult> {
  // Don't transpile inside node_modules
  if (!config.isSource) {
    return;
  }

  // Invalidate when any babel config file is added.
  for (let fileName of BABEL_CONFIG_FILENAMES) {
    config.invalidateOnFileCreate({
      fileName,
      aboveFilePath: config.searchPath,
    });
  }

  // Do nothing if we cannot resolve any babel config filenames. Checking using our own
  // config resolution (which is cached) is much faster than relying on babel.
  if (
    !(await resolveConfig(
      options.inputFS,
      config.searchPath,
      BABEL_CONFIG_FILENAMES,
      options.projectRoot,
    ))
  ) {
    return buildDefaultBabelConfig(options, config);
  }

  const babelCore: BabelCore = await options.packageManager.require(
    '@babel/core',
    config.searchPath,
    {
      range: BABEL_CORE_RANGE,
      saveDev: true,
      shouldAutoInstall: options.shouldAutoInstall,
    },
  );
  config.addDevDependency({
    specifier: '@babel/core',
    resolveFrom: config.searchPath,
    range: BABEL_CORE_RANGE,
  });

  config.invalidateOnEnvChange('BABEL_ENV');
  config.invalidateOnEnvChange('NODE_ENV');
  let babelOptions = {
    filename: config.searchPath,
    cwd: options.projectRoot,
    envName:
      options.env.BABEL_ENV ??
      options.env.NODE_ENV ??
      (options.mode === 'production' || options.mode === 'development'
        ? options.mode
        : null) ??
      'development',
    showIgnoredFiles: true,
  };

  let partialConfig: ?{|
    [string]: any,
  |} = await babelCore.loadPartialConfigAsync(babelOptions);

  let addIncludedFile = file => {
    if (JS_EXTNAME_RE.test(path.extname(file))) {
      // We need to invalidate on startup in case the config is non-static,
      // e.g. uses unknown environment variables, reads from the filesystem, etc.
      logger.warn({
        message: `It looks like you're using a JavaScript Babel config file. This means the config cannot be watched for changes, and Babel transformations cannot be cached. You'll need to restart Parcel for changes to this config to take effect. Try using a ${path.basename(
          file,
          path.extname(file),
        ) + '.json'} file instead.`,
      });
      config.invalidateOnStartup();

      // But also add the config as a dev dependency so we can at least attempt invalidation in watch mode.
      config.addDevDependency({
        specifier: relativePath(options.projectRoot, file),
        resolveFrom: path.join(options.projectRoot, 'index'),
        // Also invalidate @babel/core when the config or a dependency updates.
        // This ensures that the caches in @babel/core are also invalidated.
        additionalInvalidations: [
          {
            specifier: '@babel/core',
            resolveFrom: config.searchPath,
            range: BABEL_CORE_RANGE,
          },
        ],
      });
    } else {
      config.invalidateOnFileChange(file);
    }
  };

  let warnOldVersion = () => {
    logger.warn({
      message:
        'You are using an old version of @babel/core which does not support the necessary features for Parcel to cache and watch babel config files safely. You may need to restart Parcel for config changes to take effect. Please upgrade to @babel/core 7.12.0 or later to resolve this issue.',
    });
    config.invalidateOnStartup();
  };

  // Old versions of @babel/core return null from loadPartialConfig when the file should explicitly not be run through babel (ignore/exclude)
  if (partialConfig == null) {
    warnOldVersion();
    return;
  }

  if (partialConfig.files == null) {
    // If the files property is missing, we're on an old version of @babel/core.
    // We need to invalidate on startup because we can't properly track dependencies.
    if (partialConfig.hasFilesystemConfig()) {
      warnOldVersion();

      if (typeof partialConfig.babelrcPath === 'string') {
        addIncludedFile(partialConfig.babelrcPath);
      }

      if (typeof partialConfig.configPath === 'string') {
        addIncludedFile(partialConfig.configPath);
      }
    }
  } else {
    for (let file of partialConfig.files) {
      addIncludedFile(file);
    }
  }

  if (
    partialConfig.fileHandling != null &&
    partialConfig.fileHandling !== 'transpile'
  ) {
    return;
  } else if (partialConfig.hasFilesystemConfig()) {
    // Determine what syntax plugins we need to enable
    let syntaxPlugins = [];
    if (TYPESCRIPT_EXTNAME_RE.test(config.searchPath)) {
      syntaxPlugins.push('typescript');
      if (config.searchPath.endsWith('.tsx')) {
        syntaxPlugins.push('jsx');
      }
    } else if (await isJSX(options, config)) {
      syntaxPlugins.push('jsx');
    }

    // If the config has plugins loaded with require(), or inline plugins in the config,
    // we can't cache the result of the compilation because we don't know where they came from.
    if (hasRequire(partialConfig.options)) {
      logger.warn({
        message:
          'It looks like you are using `require` to configure Babel plugins or presets. This means Babel transformations cannot be cached and will run on each build. Please use strings to configure Babel instead.',
      });

      config.setCacheKey(JSON.stringify(Date.now()));
      config.invalidateOnStartup();
    } else {
      definePluginDependencies(config, partialConfig.options, options);
      config.setCacheKey(hashObject(partialConfig.options));
    }

    return {
      internal: false,
      config: partialConfig.options,
      targets: enginesToBabelTargets(config.env),
      syntaxPlugins,
    };
  } else {
    return buildDefaultBabelConfig(options, config);
  }
}

async function buildDefaultBabelConfig(
  options: PluginOptions,
  config: Config,
): Promise<?BabelConfigResult> {
  // If this is a .ts or .tsx file, we don't need to enable flow.
  if (TYPESCRIPT_EXTNAME_RE.test(config.searchPath)) {
    return;
  }

  // Detect flow. If not enabled, babel doesn't need to run at all.
  let babelOptions = await getFlowOptions(config, options);
  if (babelOptions == null) {
    return;
  }

  // When flow is enabled, we may also need to enable JSX so it parses properly.
  let syntaxPlugins = [];
  if (await isJSX(options, config)) {
    syntaxPlugins.push('jsx');
  }

  babelOptions.presets = (babelOptions.presets || []).map(preset =>
    internalBabelCore.createConfigItem(preset, {
      type: 'preset',
      dirname: BABEL_TRANSFORMER_DIR,
    }),
  );
  babelOptions.plugins = (babelOptions.plugins || []).map(plugin =>
    internalBabelCore.createConfigItem(plugin, {
      type: 'plugin',
      dirname: BABEL_TRANSFORMER_DIR,
    }),
  );

  definePluginDependencies(config, babelOptions, options);
  return {
    internal: true,
    config: babelOptions,
    syntaxPlugins,
  };
}

function hasRequire(options) {
  let configItems = [...options.presets, ...options.plugins];
  return configItems.some(item => !item.file);
}

function definePluginDependencies(config, babelConfig: ?BabelConfig, options) {
  if (babelConfig == null) {
    return;
  }

  let configItems = [
    ...(babelConfig.presets || []),
    ...(babelConfig.plugins || []),
  ];
  for (let configItem of configItems) {
    // FIXME: this uses a relative path from the project root rather than resolving
    // from the config location because configItem.file.request can be a shorthand
    // rather than a full package name.
    config.addDevDependency({
      specifier: relativePath(options.projectRoot, configItem.file.resolved),
      resolveFrom: path.join(options.projectRoot, 'index'),
      // Also invalidate @babel/core when the plugin or a dependency updates.
      // This ensures that the caches in @babel/core are also invalidated.
      additionalInvalidations: [
        {
          specifier: '@babel/core',
          resolveFrom: config.searchPath,
          range: BABEL_CORE_RANGE,
        },
      ],
    });
  }
}
