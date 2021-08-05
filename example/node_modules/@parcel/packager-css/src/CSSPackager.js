// @flow

import type {Root} from 'postcss';
import type {Asset} from '@parcel/types';

import path from 'path';
import SourceMap from '@parcel/source-map';
import {Packager} from '@parcel/plugin';
import {
  PromiseQueue,
  countLines,
  replaceInlineReferences,
  replaceURLReferences,
} from '@parcel/utils';

import postcss from 'postcss';
import nullthrows from 'nullthrows';

export default (new Packager({
  async package({
    bundle,
    bundleGraph,
    getInlineBundleContents,
    getSourceMapReference,
    logger,
    options,
  }) {
    let queue = new PromiseQueue({
      maxConcurrent: 32,
    });
    bundle.traverseAssets({
      exit: asset => {
        // Figure out which media types this asset was imported with.
        // We only want to import the asset once, so group them all together.
        let media = [];
        for (let dep of bundleGraph.getIncomingDependencies(asset)) {
          if (!dep.meta.media) {
            // Asset was imported without a media type. Don't wrap in @media.
            media.length = 0;
            break;
          }
          media.push(dep.meta.media);
        }

        queue.add(() => {
          // This condition needs to align with the one in Transformation#runPipeline !
          if (!asset.symbols.isCleared && options.mode === 'production') {
            // a CSS Modules asset
            return processCSSModule(
              options,
              logger,
              bundleGraph,
              bundle,
              asset,
              media,
            );
          } else {
            return Promise.all([
              asset,
              asset.getCode().then((css: string) => {
                if (media.length) {
                  return `@media ${media.join(', ')} {\n${css}\n}\n`;
                }

                return css;
              }),
              bundle.env.sourceMap && asset.getMapBuffer(),
            ]);
          }
        });
      },
    });

    let outputs = await queue.run();
    let contents = '';
    let map = new SourceMap(options.projectRoot);
    let lineOffset = 0;
    for (let [asset, code, mapBuffer] of outputs) {
      contents += code + '\n';
      if (bundle.env.sourceMap) {
        if (mapBuffer) {
          map.addBuffer(mapBuffer, lineOffset);
        } else {
          map.addEmptyMap(
            path
              .relative(options.projectRoot, asset.filePath)
              .replace(/\\+/g, '/'),
            code,
            lineOffset,
          );
        }

        lineOffset += countLines(code);
      }
    }

    if (bundle.env.sourceMap) {
      let reference = await getSourceMapReference(map);
      if (reference != null) {
        contents += '/*# sourceMappingURL=' + reference + ' */\n';
      }
    }

    ({contents, map} = replaceURLReferences({
      bundle,
      bundleGraph,
      contents,
      map,
    }));

    return replaceInlineReferences({
      bundle,
      bundleGraph,
      contents,
      getInlineBundleContents,
      getInlineReplacement: (dep, inlineType, contents) => ({
        from: dep.id,
        to: contents,
      }),
      map,
    });
  },
}): Packager);

async function processCSSModule(
  options,
  logger,
  bundleGraph,
  bundle,
  asset,
  media,
): Promise<[Asset, string, ?Buffer]> {
  let ast: Root = postcss.fromJSON(nullthrows((await asset.getAST())?.program));

  let usedSymbols = bundleGraph.getUsedSymbols(asset);
  let localSymbols = new Set(
    [...asset.symbols].map(([, {local}]) => `.${local}`),
  );

  let defaultImport = null;
  if (usedSymbols.has('default')) {
    let incoming = bundleGraph.getIncomingDependencies(asset);
    defaultImport = incoming.find(d => d.symbols.hasExportSymbol('default'));
    if (defaultImport) {
      let loc = defaultImport.symbols.get('default')?.loc;
      logger.warn({
        message:
          'CSS modules cannot be tree shaken when imported with a default specifier',
        ...(loc && {
          codeFrames: [
            {
              filePath: nullthrows(loc?.filePath ?? defaultImport.sourcePath),
              codeHighlights: [{start: loc.start, end: loc.end}],
            },
          ],
        }),
        hints: [
          `Instead do: import * as style from "${defaultImport.specifier}";`,
        ],
      });
    }
  }

  if (!defaultImport && !usedSymbols.has('*')) {
    let usedLocalSymbols = new Set(
      [...usedSymbols].map(
        exportSymbol => `.${nullthrows(asset.symbols.get(exportSymbol)).local}`,
      ),
    );
    ast.walkRules(rule => {
      if (
        localSymbols.has(rule.selector) &&
        !usedLocalSymbols.has(rule.selector)
      ) {
        rule.remove();
      }
    });
  }

  let {content, map} = await postcss().process(ast, {
    from: undefined,
    to: options.projectRoot + '/index',
    map: {
      annotation: false,
      inline: false,
    },
    // Pass postcss's own stringifier to it to silence its warning
    // as we don't want to perform any transformations -- only generate
    stringifier: postcss.stringify,
  });

  let sourceMap;
  if (bundle.env.sourceMap && map != null) {
    sourceMap = new SourceMap(options.projectRoot);
    sourceMap.addVLQMap(map.toJSON());
  }

  if (media.length) {
    content = `@media ${media.join(', ')} {\n${content}\n}\n`;
  }

  return [asset, content, sourceMap?.toBuffer()];
}
