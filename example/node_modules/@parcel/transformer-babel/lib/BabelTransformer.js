"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function _babelAstUtils() {
  const data = require("@parcel/babel-ast-utils");

  _babelAstUtils = function () {
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

function _utils() {
  const data = require("@parcel/utils");

  _utils = function () {
    return data;
  };

  return data;
}

function _sourceMap() {
  const data = _interopRequireDefault(require("@parcel/source-map"));

  _sourceMap = function () {
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

function _generator() {
  const data = _interopRequireDefault(require("@babel/generator"));

  _generator = function () {
    return data;
  };

  return data;
}

var _babel = _interopRequireDefault(require("./babel7"));

var _config = require("./config");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _default = new (_plugin().Transformer)({
  loadConfig({
    config,
    options,
    logger
  }) {
    return (0, _config.load)(config, options, logger);
  },

  canReuseAST({
    ast
  }) {
    return ast.type === 'babel' && _semver().default.satisfies(ast.version, '^7.0.0');
  },

  async transform({
    asset,
    config,
    options
  }) {
    try {
      if (config !== null && config !== void 0 && config.config) {
        if (asset.meta.babelPlugins != null && Array.isArray(asset.meta.babelPlugins)) {
          await (0, _babel.default)({
            asset,
            options,
            babelOptions: config,
            additionalPlugins: asset.meta.babelPlugins
          });
        } else {
          await (0, _babel.default)({
            asset,
            options,
            babelOptions: config
          });
        }
      }

      return [asset];
    } catch (e) {
      throw await (0, _babelAstUtils().babelErrorEnhancer)(e, asset);
    }
  },

  async generate({
    asset,
    ast,
    options
  }) {
    let originalSourceMap = await asset.getMap();
    let sourceFileName = (0, _utils().relativeUrl)(options.projectRoot, asset.filePath);
    let {
      code,
      rawMappings
    } = (0, _generator().default)(ast.program, {
      sourceFileName,
      sourceMaps: !!asset.env.sourceMap,
      comments: true
    });
    let map = new (_sourceMap().default)(options.projectRoot);

    if (rawMappings) {
      map.addIndexedMappings(rawMappings);
    }

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

    return {
      content: code,
      map
    };
  }

});

exports.default = _default;