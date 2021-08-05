// @flow

import {Transformer} from '@parcel/plugin';
import parse from 'posthtml-parser';
import nullthrows from 'nullthrows';
import render from 'posthtml-render';
import semver from 'semver';
import collectDependencies from './dependencies';
import extractInlineAssets from './inline';

export default (new Transformer({
  canReuseAST({ast}) {
    return ast.type === 'posthtml' && semver.satisfies(ast.version, '^0.4.0');
  },

  async parse({asset}) {
    return {
      type: 'posthtml',
      version: '0.4.1',
      program: parse(await asset.getCode(), {
        lowerCaseTags: true,
        lowerCaseAttributeNames: true,
        sourceLocations: true,
      }),
    };
  },

  async transform({asset, options}) {
    // Handle .htm
    asset.type = 'html';
    asset.bundleBehavior = 'isolated';
    let ast = nullthrows(await asset.getAST());
    let hasScripts = collectDependencies(asset, ast);

    const {
      assets: inlineAssets,
      hasScripts: hasInlineScripts,
    } = extractInlineAssets(asset, ast);

    const result = [asset, ...inlineAssets];

    // empty <script></script> is added to make sure HMR is working even if user
    // didn't add any. It's inserted at the very end to take into account cases
    // when there's no html/head/body in source html.
    if (options.hmrOptions && !(hasScripts || hasInlineScripts)) {
      ast.program.push({
        tag: 'script',
        attrs: {
          src: asset.addURLDependency('hmr.js', {
            priority: 'parallel',
          }),
        },
        content: [],
      });

      asset.setAST(ast);

      result.push({
        type: 'js',
        content: '',
        uniqueKey: 'hmr.js',
      });
    }

    return result;
  },

  generate({ast}) {
    return {
      content: render(ast.program),
    };
  },
}): Transformer);
