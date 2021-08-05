"use strict";

var _postcss = require("postcss");

var _postcss2 = _interopRequireDefault(_postcss);

var _lodash = require("lodash.camelcase");

var _lodash2 = _interopRequireDefault(_lodash);

var _genericNames = require("generic-names");

var _genericNames2 = _interopRequireDefault(_genericNames);

var _parser = require("./css-loader-core/parser");

var _parser2 = _interopRequireDefault(_parser);

var _loader = require("./css-loader-core/loader");

var _loader2 = _interopRequireDefault(_loader);

var _generateScopedName = require("./generateScopedName");

var _generateScopedName2 = _interopRequireDefault(_generateScopedName);

var _saveJSON = require("./saveJSON");

var _saveJSON2 = _interopRequireDefault(_saveJSON);

var _behaviours = require("./behaviours");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const PLUGIN_NAME = "postcss-modules";

function getDefaultScopeBehaviour(opts) {
  if (opts.scopeBehaviour && (0, _behaviours.isValidBehaviour)(opts.scopeBehaviour)) {
    return opts.scopeBehaviour;
  }

  return _behaviours.behaviours.LOCAL;
}

function getScopedNameGenerator(opts) {
  const scopedNameGenerator = opts.generateScopedName || _generateScopedName2.default;

  if (typeof scopedNameGenerator === "function") return scopedNameGenerator;
  return (0, _genericNames2.default)(scopedNameGenerator, {
    context: process.cwd(),
    hashPrefix: opts.hashPrefix
  });
}

function getLoader(opts, plugins) {
  const root = typeof opts.root === "undefined" ? "/" : opts.root;
  return typeof opts.Loader === "function" ? new opts.Loader(root, plugins) : new _loader2.default(root, plugins);
}

function isGlobalModule(globalModules, inputFile) {
  return globalModules.some(regex => inputFile.match(regex));
}

function getDefaultPluginsList(opts, inputFile) {
  const globalModulesList = opts.globalModulePaths || null;
  const exportGlobals = opts.exportGlobals || false;
  const defaultBehaviour = getDefaultScopeBehaviour(opts);
  const generateScopedName = getScopedNameGenerator(opts);

  if (globalModulesList && isGlobalModule(globalModulesList, inputFile)) {
    return (0, _behaviours.getDefaultPlugins)({
      behaviour: _behaviours.behaviours.GLOBAL,
      generateScopedName,
      exportGlobals
    });
  }

  return (0, _behaviours.getDefaultPlugins)({
    behaviour: defaultBehaviour,
    generateScopedName,
    exportGlobals
  });
}

function isOurPlugin(plugin) {
  return plugin.postcssPlugin === PLUGIN_NAME;
}

function dashesCamelCase(string) {
  return string.replace(/-+(\w)/g, (_, firstLetter) => firstLetter.toUpperCase());
}

module.exports = _postcss2.default.plugin(PLUGIN_NAME, (opts = {}) => {
  const getJSON = opts.getJSON || _saveJSON2.default;

  return (() => {
    var _ref = _asyncToGenerator(function* (css, result) {
      const inputFile = css.source.input.file;
      const pluginList = getDefaultPluginsList(opts, inputFile);
      const resultPluginIndex = result.processor.plugins.findIndex(function (plugin) {
        return isOurPlugin(plugin);
      });
      if (resultPluginIndex === -1) {
        throw new Error('Plugin missing from options.');
      }
      const earlierPlugins = result.processor.plugins.slice(0, resultPluginIndex);
      const loaderPlugins = [...earlierPlugins, ...pluginList];
      const loader = getLoader(opts, loaderPlugins);
      const parser = new _parser2.default(loader.fetch.bind(loader));

      yield (0, _postcss2.default)([...pluginList, parser.plugin]).process(css, {
        from: inputFile
      });

      const out = loader.finalSource;
      if (out) css.prepend(out);

      if (opts.localsConvention) {
        const isFunc = typeof opts.localsConvention === "function";

        parser.exportTokens = Object.entries(parser.exportTokens).reduce(function (tokens, [className, value]) {
          if (isFunc) {
            tokens[opts.localsConvention(className, value, inputFile)] = value;

            return tokens;
          }

          switch (opts.localsConvention) {
            case "camelCase":
              tokens[className] = value;
              tokens[(0, _lodash2.default)(className)] = value;

              break;
            case "camelCaseOnly":
              tokens[(0, _lodash2.default)(className)] = value;

              break;
            case "dashes":
              tokens[className] = value;
              tokens[dashesCamelCase(className)] = value;

              break;
            case "dashesOnly":
              tokens[dashesCamelCase(className)] = value;

              break;
          }

          return tokens;
        }, {});
      }

      result.messages.push({
        type: "export",
        plugin: "postcss-modules",
        exportTokens: parser.exportTokens
      });

      // getJSON may return a promise
      return getJSON(css.source.input.file, parser.exportTokens, result.opts.to);
    });

    return function (_x, _x2) {
      return _ref.apply(this, arguments);
    };
  })();
});