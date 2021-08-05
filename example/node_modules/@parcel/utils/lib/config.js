"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.resolveConfig = resolveConfig;
exports.resolveConfigSync = resolveConfigSync;
exports.loadConfig = loadConfig;

function _path() {
  const data = _interopRequireDefault(require("path"));

  _path = function () {
    return data;
  };

  return data;
}

function _clone() {
  const data = _interopRequireDefault(require("clone"));

  _clone = function () {
    return data;
  };

  return data;
}

function _json() {
  const data = require("json5");

  _json = function () {
    return data;
  };

  return data;
}

function _toml() {
  const data = require("@iarna/toml");

  _toml = function () {
    return data;
  };

  return data;
}

function _lruCache() {
  const data = _interopRequireDefault(require("lru-cache"));

  _lruCache = function () {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const configCache = new (_lruCache().default)({
  max: 500
});
const resolveCache = new Map();

function resolveConfig(fs, filepath, filenames, projectRoot) {
  // Cache the result of resolving config for this directory.
  // This is automatically invalidated at the end of the current build.
  let key = _path().default.dirname(filepath) + filenames.join(',');
  let cached = resolveCache.get(key);

  if (cached !== undefined) {
    return Promise.resolve(cached);
  }

  let resolved = fs.findAncestorFile(filenames, _path().default.dirname(filepath), projectRoot);
  resolveCache.set(key, resolved);
  return Promise.resolve(resolved);
}

function resolveConfigSync(fs, filepath, filenames, projectRoot) {
  return fs.findAncestorFile(filenames, _path().default.dirname(filepath), projectRoot);
}

async function loadConfig(fs, filepath, filenames, projectRoot, opts) {
  var _opts$parse;

  let parse = (_opts$parse = opts === null || opts === void 0 ? void 0 : opts.parse) !== null && _opts$parse !== void 0 ? _opts$parse : true;
  let configFile = await resolveConfig(fs, filepath, filenames, projectRoot);

  if (configFile) {
    let cachedOutput = configCache.get(String(parse) + configFile);

    if (cachedOutput) {
      return cachedOutput;
    }

    try {
      let extname = _path().default.extname(configFile).slice(1);

      if (extname === 'js') {
        let output = {
          // $FlowFixMe
          config: (0, _clone().default)(require(configFile)),
          files: [{
            filePath: configFile
          }]
        };
        configCache.set(configFile, output);
        return output;
      }

      let configContent = await fs.readFile(configFile, 'utf8');
      if (!configContent) return null;
      let config;

      if (parse === false) {
        config = configContent;
      } else {
        var _opts$parser;

        let parse = (_opts$parser = opts === null || opts === void 0 ? void 0 : opts.parser) !== null && _opts$parser !== void 0 ? _opts$parser : getParser(extname);
        config = parse(configContent);
      }

      let output = {
        config,
        files: [{
          filePath: configFile
        }]
      };
      configCache.set(String(parse) + configFile, output);
      return output;
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND' || err.code === 'ENOENT') {
        return null;
      }

      throw err;
    }
  }

  return null;
}

loadConfig.clear = () => {
  configCache.reset();
  resolveCache.clear();
};

function getParser(extname) {
  switch (extname) {
    case 'toml':
      return _toml().parse;

    case 'json':
    default:
      return _json().parse;
  }
}