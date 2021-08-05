// @flow

import {Transformer} from '@parcel/plugin';

import path from 'path';
import posthtml from 'posthtml';
import parse from 'posthtml-parser';
import render from 'posthtml-render';
import nullthrows from 'nullthrows';
import semver from 'semver';
import {relativePath} from '@parcel/utils';
import loadPlugins from './loadPlugins';

export default (new Transformer({
  async loadConfig({config, options, logger}) {
    let configFile = await config.getConfig(
      ['.posthtmlrc', '.posthtmlrc.js', 'posthtml.config.js'],
      {
        packageKey: 'posthtml',
      },
    );

    if (configFile) {
      let isJavascript = path.extname(configFile.filePath) === '.js';
      if (isJavascript) {
        // We have to invalidate on startup in case the config is non-deterministic,
        // e.g. using unknown environment variables, reading from the filesystem, etc.
        logger.warn({
          message:
            'WARNING: Using a JavaScript PostHTML config file means losing out on caching features of Parcel. Use a .posthtmlrc (JSON) file whenever possible.',
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

      // Load plugins. This must be done before adding dev dependencies so we auto install.
      let plugins = await loadPlugins(
        configFile.contents.plugins,
        config.searchPath,
        options,
      );

      // Now add dev dependencies so we invalidate when they change.
      let pluginArray = Array.isArray(configFile.contents.plugins)
        ? configFile.contents.plugins
        : Object.keys(configFile.contents.plugins);
      for (let p of pluginArray) {
        if (typeof p === 'string') {
          config.addDevDependency({
            specifier: p,
            resolveFrom: configFile.filePath,
          });
        }
      }

      configFile.contents.plugins = plugins;

      // tells posthtml that we have already called parse
      configFile.contents.skipParse = true;
      delete configFile.contents.render;

      return configFile.contents;
    }
  },

  canReuseAST({ast}) {
    return ast.type === 'posthtml' && semver.satisfies(ast.version, '^0.4.0');
  },

  async parse({asset, config}) {
    // if we don't have a config it is posthtml is not configure, don't parse
    if (!config) {
      return;
    }

    return {
      type: 'posthtml',
      version: '0.4.1',
      program: parse(await asset.getCode(), {
        lowerCaseAttributeNames: true,
        sourceLocations: true,
      }),
    };
  },

  async transform({asset, config}) {
    if (!config) {
      return [asset];
    }

    let ast = nullthrows(await asset.getAST());
    let res = await posthtml(config.plugins).process(ast.program, {
      ...config,
      plugins: config.plugins,
    });

    if (res.messages) {
      await Promise.all(
        res.messages.map(({type, file: filePath}) => {
          if (type === 'dependency') {
            return asset.invalidateOnFileChange(filePath);
          }
          return Promise.resolve();
        }),
      );
    }

    asset.setAST({
      type: 'posthtml',
      version: '0.4.1',
      program: JSON.parse(JSON.stringify(res.tree)), // posthtml adds functions to the AST that are not serializable
    });

    return [asset];
  },

  generate({ast}) {
    return {
      content: render(ast.program),
    };
  },
}): Transformer);
