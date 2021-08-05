"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function _sourceMap() {
  const data = _interopRequireDefault(require("@parcel/source-map"));

  _sourceMap = function () {
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

function _postcss() {
  const data = _interopRequireDefault(require("postcss"));

  _postcss = function () {
    return data;
  };

  return data;
}

function _cssnano() {
  const data = _interopRequireDefault(require("cssnano"));

  _cssnano = function () {
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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// TODO the type is based on cssnano 4
var _default = new (_plugin().Optimizer)({
  async loadConfig({
    config
  }) {
    const configFile = await config.getConfig(['.cssnanorc', 'cssnano.config.json', 'cssnano.config.js'], {
      packageKey: 'cssnano'
    });

    if (configFile) {
      let isJavascript = _path().default.extname(configFile.filePath) === '.js';

      if (isJavascript) {
        config.invalidateOnStartup();
      }

      return configFile.contents;
    }
  },

  async optimize({
    bundle,
    contents: prevContents,
    getSourceMapReference,
    map: prevMap,
    config,
    options
  }) {
    if (!bundle.env.shouldOptimize) {
      return {
        contents: prevContents,
        map: prevMap
      };
    }

    if (typeof prevContents !== 'string') {
      throw new Error('CSSNanoOptimizer: Only string contents are currently supported');
    }

    const result = await (0, _postcss().default)([(0, _cssnano().default)(config !== null && config !== void 0 ? config : {})]).process(prevContents, {
      // Suppress postcss's warning about a missing `from` property. In this
      // case, the input map contains all of the sources.
      from: undefined,
      map: {
        annotation: false,
        inline: false,
        prev: prevMap ? await prevMap.stringify({}) : null
      }
    });
    let map;

    if (result.map != null) {
      map = new (_sourceMap().default)(options.projectRoot);
      map.addVLQMap(result.map.toJSON());
    }

    let contents = result.css;

    if (bundle.env.sourceMap) {
      let reference = await getSourceMapReference(map);

      if (reference != null) {
        contents += '\n' + '/*# sourceMappingURL=' + reference + ' */\n';
      }
    }

    return {
      contents,
      map
    };
  }

});

exports.default = _default;