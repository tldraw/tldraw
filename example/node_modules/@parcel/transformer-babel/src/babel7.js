// @flow

import type {MutableAsset, AST, PluginOptions} from '@parcel/types';

import invariant from 'assert';
import * as internalBabelCore from '@babel/core';
import {relativeUrl} from '@parcel/utils';
import {remapAstLocations} from '@parcel/babel-ast-utils';

import packageJson from '../package.json';

const transformerVersion: mixed = packageJson.version;
invariant(typeof transformerVersion === 'string');

type Babel7TransformOptions = {|
  asset: MutableAsset,
  options: PluginOptions,
  babelOptions: any,
  additionalPlugins?: Array<any>,
|};

export default async function babel7(
  opts: Babel7TransformOptions,
): Promise<?AST> {
  let {asset, options, babelOptions, additionalPlugins = []} = opts;
  const babelCore = babelOptions.internal
    ? internalBabelCore
    : await options.packageManager.require('@babel/core', asset.filePath, {
        range: '^7.12.0',
        saveDev: true,
        shouldAutoInstall: options.shouldAutoInstall,
      });

  let config = {
    ...babelOptions.config,
    plugins: additionalPlugins.concat(babelOptions.config.plugins),
    code: false,
    ast: true,
    filename: asset.filePath,
    babelrc: false,
    configFile: false,
    parserOpts: {
      ...babelOptions.config.parserOpts,
      sourceFilename: relativeUrl(options.projectRoot, asset.filePath),
      allowReturnOutsideFunction: true,
      strictMode: false,
      sourceType: 'module',
      plugins: [
        ...(babelOptions.config.parserOpts?.plugins ?? []),
        ...(babelOptions.syntaxPlugins ?? []),
        // Applied by preset-env
        'classProperties',
        'classPrivateProperties',
        'classPrivateMethods',
        'exportDefaultFrom',
        // 'topLevelAwait'
      ],
    },
    caller: {
      name: 'parcel',
      version: transformerVersion,
      targets: JSON.stringify(babelOptions.targets),
      outputFormat: asset.env.outputFormat,
    },
  };

  let ast = await asset.getAST();
  let res;
  if (ast) {
    res = await babelCore.transformFromAstAsync(
      ast.program,
      asset.isASTDirty() ? undefined : await asset.getCode(),
      config,
    );
  } else {
    res = await babelCore.transformAsync(await asset.getCode(), config);
    if (res.ast) {
      let map = await asset.getMap();
      if (map) {
        remapAstLocations(res.ast, map);
      }
    }
  }

  if (res.ast) {
    asset.setAST({
      type: 'babel',
      version: '7.0.0',
      program: res.ast,
    });
  }
}
