"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = babel7;

function _assert() {
  const data = _interopRequireDefault(require("assert"));

  _assert = function () {
    return data;
  };

  return data;
}

function internalBabelCore() {
  const data = _interopRequireWildcard(require("@babel/core"));

  internalBabelCore = function () {
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

function _babelAstUtils() {
  const data = require("@parcel/babel-ast-utils");

  _babelAstUtils = function () {
    return data;
  };

  return data;
}

var _package = _interopRequireDefault(require("../package.json"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const transformerVersion = _package.default.version;
(0, _assert().default)(typeof transformerVersion === 'string');

async function babel7(opts) {
  var _babelOptions$config$, _babelOptions$config$2, _babelOptions$syntaxP;

  let {
    asset,
    options,
    babelOptions,
    additionalPlugins = []
  } = opts;
  const babelCore = babelOptions.internal ? internalBabelCore() : await options.packageManager.require('@babel/core', asset.filePath, {
    range: '^7.12.0',
    saveDev: true,
    shouldAutoInstall: options.shouldAutoInstall
  });
  let config = { ...babelOptions.config,
    plugins: additionalPlugins.concat(babelOptions.config.plugins),
    code: false,
    ast: true,
    filename: asset.filePath,
    babelrc: false,
    configFile: false,
    parserOpts: { ...babelOptions.config.parserOpts,
      sourceFilename: (0, _utils().relativeUrl)(options.projectRoot, asset.filePath),
      allowReturnOutsideFunction: true,
      strictMode: false,
      sourceType: 'module',
      plugins: [...((_babelOptions$config$ = (_babelOptions$config$2 = babelOptions.config.parserOpts) === null || _babelOptions$config$2 === void 0 ? void 0 : _babelOptions$config$2.plugins) !== null && _babelOptions$config$ !== void 0 ? _babelOptions$config$ : []), ...((_babelOptions$syntaxP = babelOptions.syntaxPlugins) !== null && _babelOptions$syntaxP !== void 0 ? _babelOptions$syntaxP : []), // Applied by preset-env
      'classProperties', 'classPrivateProperties', 'classPrivateMethods', 'exportDefaultFrom' // 'topLevelAwait'
      ]
    },
    caller: {
      name: 'parcel',
      version: transformerVersion,
      targets: JSON.stringify(babelOptions.targets),
      outputFormat: asset.env.outputFormat
    }
  };
  let ast = await asset.getAST();
  let res;

  if (ast) {
    res = await babelCore.transformFromAstAsync(ast.program, asset.isASTDirty() ? undefined : await asset.getCode(), config);
  } else {
    res = await babelCore.transformAsync(await asset.getCode(), config);

    if (res.ast) {
      let map = await asset.getMap();

      if (map) {
        (0, _babelAstUtils().remapAstLocations)(res.ast, map);
      }
    }
  }

  if (res.ast) {
    asset.setAST({
      type: 'babel',
      version: '7.0.0',
      program: res.ast
    });
  }
}