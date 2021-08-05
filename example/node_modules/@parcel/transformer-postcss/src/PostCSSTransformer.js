// @flow

import type {FilePath, MutableAsset, PluginOptions} from '@parcel/types';

import {hashString} from '@parcel/hash';
import {glob} from '@parcel/utils';
import {Transformer} from '@parcel/plugin';
import FileSystemLoader from 'css-modules-loader-core/lib/file-system-loader';
import nullthrows from 'nullthrows';
import path from 'path';
import semver from 'semver';
import valueParser from 'postcss-value-parser';
import postcssModules from 'postcss-modules';
import typeof * as Postcss from 'postcss';

import {load} from './loadConfig';
import {POSTCSS_RANGE} from './constants';

const COMPOSES_RE = /composes:.+from\s*("|').*("|')\s*;?/;
const FROM_IMPORT_RE = /.+from\s*(?:"|')(.*)(?:"|')\s*;?/;

export default (new Transformer({
  loadConfig({config, options, logger}) {
    return load({config, options, logger});
  },

  canReuseAST({ast}) {
    return (
      ast.type === 'postcss' && semver.satisfies(ast.version, POSTCSS_RANGE)
    );
  },

  async parse({asset, config, options}) {
    if (!config) {
      return;
    }

    const postcss = await loadPostcss(options, asset.filePath);

    return {
      type: 'postcss',
      version: '8.2.1',
      program: postcss
        .parse(await asset.getCode(), {
          from: asset.filePath,
        })
        .toJSON(),
    };
  },

  async transform({asset, config, options, resolve}) {
    asset.type = 'css';
    if (!config) {
      return [asset];
    }

    const postcss: Postcss = await loadPostcss(options, asset.filePath);

    let plugins = [...config.hydrated.plugins];
    let cssModules: ?{|[string]: string|} = null;
    if (config.hydrated.modules) {
      plugins.push(
        postcssModules({
          getJSON: (filename, json) => (cssModules = json),
          Loader: createLoader(asset, resolve),
          generateScopedName: (name, filename) =>
            `_${name}_${hashString(
              path.relative(options.projectRoot, filename),
            ).substr(0, 6)}`,
          ...config.hydrated.modules,
        }),
      );
    }

    let ast = nullthrows(await asset.getAST());
    let program = postcss.fromJSON(ast.program);
    let code = asset.isASTDirty() ? null : await asset.getCode();
    if (code == null || COMPOSES_RE.test(code)) {
      program.walkDecls(decl => {
        let [, importPath] = FROM_IMPORT_RE.exec(decl.value) || [];
        if (decl.prop === 'composes' && importPath != null) {
          let parsed = valueParser(decl.value);

          parsed.walk(node => {
            if (node.type === 'string') {
              asset.addDependency({
                specifier: importPath,
                specifierType: 'url',
                loc: {
                  filePath: asset.filePath,
                  start: decl.source.start,
                  end: {
                    line: decl.source.start.line,
                    column: decl.source.start.column + importPath.length,
                  },
                },
              });
            }
          });
        }
      });
    }

    // $FlowFixMe Added in Flow 0.121.0 upgrade in #4381
    let {messages, root} = await postcss(plugins).process(
      program,
      config.hydrated,
    );
    asset.setAST({
      type: 'postcss',
      version: '8.2.1',
      program: root.toJSON(),
    });
    for (let msg of messages) {
      if (msg.type === 'dependency') {
        asset.invalidateOnFileChange(msg.file);
      } else if (msg.type === 'dir-dependency') {
        let pattern = `${msg.dir}/${msg.glob ?? '**/*'}`;
        let files = await glob(pattern, asset.fs, {onlyFiles: true});
        for (let file of files) {
          asset.invalidateOnFileChange(path.normalize(file));
        }
        asset.invalidateOnFileCreate({glob: pattern});
      }
    }

    let assets = [asset];
    if (cssModules) {
      // $FlowFixMe
      let cssModulesList = (Object.entries(cssModules): Array<
        [string, string],
      >);
      let deps = asset.getDependencies().filter(dep => dep.priority === 'sync');
      let code: string;
      if (deps.length > 0) {
        code = `
          module.exports = Object.assign({}, ${deps
            .map(dep => `require(${JSON.stringify(dep.specifier)})`)
            .join(', ')}, ${JSON.stringify(cssModules, null, 2)});
        `;
      } else {
        code = cssModulesList
          .map(
            // This syntax enables shaking the invidual statements, so that unused classes don't even exist in JS.
            ([className, classNameHashed]) =>
              `module.exports[${JSON.stringify(className)}] = ${JSON.stringify(
                classNameHashed,
              )};`,
          )
          .join('\n');
      }

      asset.symbols.ensure();
      for (let [k, v] of cssModulesList) {
        asset.symbols.set(k, v);
      }
      asset.symbols.set('default', 'default');

      assets.push({
        type: 'js',
        content: code,
      });
    }
    return assets;
  },

  async generate({asset, ast, options}) {
    const postcss: Postcss = await loadPostcss(options, asset.filePath);

    let code = '';
    postcss.stringify(postcss.fromJSON(ast.program), c => {
      code += c;
    });

    return {
      content: code,
    };
  },
}): Transformer);

function createLoader(
  asset: MutableAsset,
  resolve: (from: FilePath, to: string) => Promise<FilePath>,
) {
  return class ParcelFileSystemLoader extends FileSystemLoader {
    async fetch(composesPath, relativeTo) {
      let importPath = composesPath.replace(/^["']|["']$/g, '');
      let resolved = await resolve(relativeTo, importPath);
      let rootRelativePath = path.resolve(path.dirname(relativeTo), resolved);
      let root = path.resolve('/');
      // fixes an issue on windows which is part of the css-modules-loader-core
      // see https://github.com/css-modules/css-modules-loader-core/issues/230
      if (rootRelativePath.startsWith(root)) {
        rootRelativePath = rootRelativePath.substr(root.length);
      }

      let source = await asset.fs.readFile(resolved, 'utf-8');
      let {exportTokens} = await this.core.load(
        source,
        rootRelativePath,
        undefined,
        // $FlowFixMe[method-unbinding]
        this.fetch.bind(this),
      );
      return exportTokens;
    }

    get finalSource() {
      return '';
    }
  };
}

function loadPostcss(options: PluginOptions, from: FilePath): Promise<Postcss> {
  return options.packageManager.require('postcss', from, {
    range: POSTCSS_RANGE,
    saveDev: true,
    shouldAutoInstall: options.shouldAutoInstall,
  });
}
