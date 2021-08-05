// @flow strict-local

import type {
  AST,
  BaseAsset,
  PluginOptions,
  SourceLocation,
  FilePath,
} from '@parcel/types';
import type {
  SourceLocation as BabelSourceLocation,
  File as BabelNodeFile,
} from '@babel/types';

import path from 'path';
import {parse as babelParse} from '@babel/parser';
import SourceMap from '@parcel/source-map';
import {relativeUrl} from '@parcel/utils';
import {traverseAll} from '@parcel/babylon-walk';
import {babelErrorEnhancer} from './babelErrorUtils';
// $FlowFixMe
import {generate as astringGenerate} from 'astring';
// $FlowFixMe
import {generator, expressionsPrecedence} from './generator';

export {babelErrorEnhancer};

export function remapAstLocations(ast: BabelNodeFile, map: SourceMap) {
  // remap ast to original mappings
  // This improves sourcemap accuracy and fixes sourcemaps when scope-hoisting
  traverseAll(ast.program, node => {
    if (node.loc) {
      if (node.loc?.start) {
        let mapping = map.findClosestMapping(
          node.loc.start.line,
          node.loc.start.column,
        );

        if (mapping?.original) {
          // $FlowFixMe
          node.loc.start.line = mapping.original.line;
          // $FlowFixMe
          node.loc.start.column = mapping.original.column;

          // $FlowFixMe
          let length = node.loc.end.column - node.loc.start.column;

          // $FlowFixMe
          node.loc.end.line = mapping.original.line;
          // $FlowFixMe
          node.loc.end.column = mapping.original.column + length;

          // $FlowFixMe
          node.loc.filename = mapping.source;
        } else {
          // Maintain null mappings?
          node.loc = null;
        }
      }
    }
  });
}

export async function parse({
  asset,
  code,
  options,
}: {|
  asset: BaseAsset,
  code: string,
  options: PluginOptions,
|}): Promise<AST> {
  try {
    let program = babelParse(code, {
      sourceFilename: relativeUrl(options.projectRoot, asset.filePath),
      allowReturnOutsideFunction: true,
      strictMode: false,
      sourceType: 'module',
    });

    let map = await asset.getMap();
    if (map) {
      remapAstLocations(program, map);
    }

    return {
      type: 'babel',
      version: '7.0.0',
      program,
    };
  } catch (e) {
    throw await babelErrorEnhancer(e, asset);
  }
}

// astring is ~50x faster than @babel/generator. We use it with a custom
// generator to handle the Babel AST differences from ESTree.
export function generateAST({
  ast,
  sourceFileName,
  sourceMaps,
  options,
}: {|
  ast: BabelNodeFile,
  sourceFileName?: FilePath,
  sourceMaps?: boolean,
  options: PluginOptions,
|}): {|content: string, map: SourceMap|} {
  let map = new SourceMap(options.projectRoot);
  let mappings = [];
  let generated = astringGenerate(ast.program, {
    generator,
    expressionsPrecedence,
    comments: true,
    sourceMap: sourceMaps
      ? {
          file: sourceFileName,
          addMapping(mapping) {
            // Copy the object because astring mutates it
            mappings.push({
              original: mapping.original,
              generated: {
                line: mapping.generated.line,
                column: mapping.generated.column,
              },
              name: mapping.name,
              source: mapping.source,
            });
          },
        }
      : null,
  });

  map.addIndexedMappings(mappings);

  return {
    content: generated,
    map,
  };
}

export async function generate({
  asset,
  ast,
  options,
}: {|
  asset: BaseAsset,
  ast: AST,
  options: PluginOptions,
|}): Promise<{|content: string, map: ?SourceMap|}> {
  let sourceFileName: string = relativeUrl(options.projectRoot, asset.filePath);
  let {content, map} = generateAST({
    ast: ast.program,
    sourceFileName,
    sourceMaps: !!asset.env.sourceMap,
    options,
  });

  let originalSourceMap = await asset.getMap();
  if (originalSourceMap) {
    // The babel AST already contains the correct mappings, but not the source contents.
    // We need to copy over the source contents from the original map.
    let sourcesContent = originalSourceMap.getSourcesContentMap();
    for (let filePath in sourcesContent) {
      let content = sourcesContent[filePath];
      if (content != null) {
        map.setSourceContent(filePath, content);
      }
    }
  }

  return {content, map};
}

export function convertBabelLoc(
  options: PluginOptions,
  loc: ?BabelSourceLocation,
): ?SourceLocation {
  if (!loc) return null;
  let {filename, start, end} = loc;
  if (filename == null) return null;
  return {
    filePath: path.resolve(options.projectRoot, filename),
    start: {
      line: start.line,
      column: start.column + 1,
    },
    // - Babel's columns are exclusive, ours are inclusive (column - 1)
    // - Babel has 0-based columns, ours are 1-based (column + 1)
    // = +-0
    end: {
      line: end.line,
      column: end.column,
    },
  };
}
