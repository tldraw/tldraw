"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function _hash() {
  const data = require("@parcel/hash");

  _hash = function () {
    return data;
  };

  return data;
}

function _utils() {
  const data = require("@parcel/utils");

  _utils = function () {
    return data;
  };

  return data;
}

function _plugin() {
  const data = require("@parcel/plugin");

  _plugin = function () {
    return data;
  };

  return data;
}

function _fileSystemLoader() {
  const data = _interopRequireDefault(require("css-modules-loader-core/lib/file-system-loader"));

  _fileSystemLoader = function () {
    return data;
  };

  return data;
}

function _nullthrows() {
  const data = _interopRequireDefault(require("nullthrows"));

  _nullthrows = function () {
    return data;
  };

  return data;
}

function _path() {
  const data = _interopRequireDefault(require("path"));

  _path = function () {
    return data;
  };

  return data;
}

function _semver() {
  const data = _interopRequireDefault(require("semver"));

  _semver = function () {
    return data;
  };

  return data;
}

function _postcssValueParser() {
  const data = _interopRequireDefault(require("postcss-value-parser"));

  _postcssValueParser = function () {
    return data;
  };

  return data;
}

function _postcssModules() {
  const data = _interopRequireDefault(require("postcss-modules"));

  _postcssModules = function () {
    return data;
  };

  return data;
}

var _loadConfig = require("./loadConfig");

var _constants = require("./constants");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const COMPOSES_RE = /composes:.+from\s*("|').*("|')\s*;?/;
const FROM_IMPORT_RE = /.+from\s*(?:"|')(.*)(?:"|')\s*;?/;

var _default = new (_plugin().Transformer)({
  loadConfig({
    config,
    options,
    logger
  }) {
    return (0, _loadConfig.load)({
      config,
      options,
      logger
    });
  },

  canReuseAST({
    ast
  }) {
    return ast.type === 'postcss' && _semver().default.satisfies(ast.version, _constants.POSTCSS_RANGE);
  },

  async parse({
    asset,
    config,
    options
  }) {
    if (!config) {
      return;
    }

    const postcss = await loadPostcss(options, asset.filePath);
    return {
      type: 'postcss',
      version: '8.2.1',
      program: postcss.parse(await asset.getCode(), {
        from: asset.filePath
      }).toJSON()
    };
  },

  async transform({
    asset,
    config,
    options,
    resolve
  }) {
    asset.type = 'css';

    if (!config) {
      return [asset];
    }

    const postcss = await loadPostcss(options, asset.filePath);
    let plugins = [...config.hydrated.plugins];
    let cssModules = null;

    if (config.hydrated.modules) {
      plugins.push((0, _postcssModules().default)({
        getJSON: (filename, json) => cssModules = json,
        Loader: createLoader(asset, resolve),
        generateScopedName: (name, filename) => `_${name}_${(0, _hash().hashString)(_path().default.relative(options.projectRoot, filename)).substr(0, 6)}`,
        ...config.hydrated.modules
      }));
    }

    let ast = (0, _nullthrows().default)(await asset.getAST());
    let program = postcss.fromJSON(ast.program);
    let code = asset.isASTDirty() ? null : await asset.getCode();

    if (code == null || COMPOSES_RE.test(code)) {
      program.walkDecls(decl => {
        let [, importPath] = FROM_IMPORT_RE.exec(decl.value) || [];

        if (decl.prop === 'composes' && importPath != null) {
          let parsed = (0, _postcssValueParser().default)(decl.value);
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
                    column: decl.source.start.column + importPath.length
                  }
                }
              });
            }
          });
        }
      });
    } // $FlowFixMe Added in Flow 0.121.0 upgrade in #4381


    let {
      messages,
      root
    } = await postcss(plugins).process(program, config.hydrated);
    asset.setAST({
      type: 'postcss',
      version: '8.2.1',
      program: root.toJSON()
    });

    for (let msg of messages) {
      if (msg.type === 'dependency') {
        asset.invalidateOnFileChange(msg.file);
      } else if (msg.type === 'dir-dependency') {
        var _msg$glob;

        let pattern = `${msg.dir}/${(_msg$glob = msg.glob) !== null && _msg$glob !== void 0 ? _msg$glob : '**/*'}`;
        let files = await (0, _utils().glob)(pattern, asset.fs, {
          onlyFiles: true
        });

        for (let file of files) {
          asset.invalidateOnFileChange(_path().default.normalize(file));
        }

        asset.invalidateOnFileCreate({
          glob: pattern
        });
      }
    }

    let assets = [asset];

    if (cssModules) {
      // $FlowFixMe
      let cssModulesList = Object.entries(cssModules);
      let deps = asset.getDependencies().filter(dep => dep.priority === 'sync');
      let code;

      if (deps.length > 0) {
        code = `
          module.exports = Object.assign({}, ${deps.map(dep => `require(${JSON.stringify(dep.specifier)})`).join(', ')}, ${JSON.stringify(cssModules, null, 2)});
        `;
      } else {
        code = cssModulesList.map( // This syntax enables shaking the invidual statements, so that unused classes don't even exist in JS.
        ([className, classNameHashed]) => `module.exports[${JSON.stringify(className)}] = ${JSON.stringify(classNameHashed)};`).join('\n');
      }

      asset.symbols.ensure();

      for (let [k, v] of cssModulesList) {
        asset.symbols.set(k, v);
      }

      asset.symbols.set('default', 'default');
      assets.push({
        type: 'js',
        content: code
      });
    }

    return assets;
  },

  async generate({
    asset,
    ast,
    options
  }) {
    const postcss = await loadPostcss(options, asset.filePath);
    let code = '';
    postcss.stringify(postcss.fromJSON(ast.program), c => {
      code += c;
    });
    return {
      content: code
    };
  }

});

exports.default = _default;

function createLoader(asset, resolve) {
  return class extends _fileSystemLoader().default {
    async fetch(composesPath, relativeTo) {
      let importPath = composesPath.replace(/^["']|["']$/g, '');
      let resolved = await resolve(relativeTo, importPath);

      let rootRelativePath = _path().default.resolve(_path().default.dirname(relativeTo), resolved);

      let root = _path().default.resolve('/'); // fixes an issue on windows which is part of the css-modules-loader-core
      // see https://github.com/css-modules/css-modules-loader-core/issues/230


      if (rootRelativePath.startsWith(root)) {
        rootRelativePath = rootRelativePath.substr(root.length);
      }

      let source = await asset.fs.readFile(resolved, 'utf-8');
      let {
        exportTokens
      } = await this.core.load(source, rootRelativePath, undefined, // $FlowFixMe[method-unbinding]
      this.fetch.bind(this));
      return exportTokens;
    }

    get finalSource() {
      return '';
    }

  };
}

function loadPostcss(options, from) {
  return options.packageManager.require('postcss', from, {
    range: _constants.POSTCSS_RANGE,
    saveDev: true,
    shouldAutoInstall: options.shouldAutoInstall
  });
}