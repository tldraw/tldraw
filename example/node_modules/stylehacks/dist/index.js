"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _browserslist = _interopRequireDefault(require("browserslist"));

var _plugins = _interopRequireDefault(require("./plugins"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function pluginCreator(opts = {}) {
  return {
    postcssPlugin: 'stylehacks',

    OnceExit(css, {
      result
    }) {
      const resultOpts = result.opts || {};
      const browsers = (0, _browserslist.default)(null, {
        stats: resultOpts.stats,
        path: __dirname,
        env: resultOpts.env
      });

      const processors = _plugins.default.reduce((list, Plugin) => {
        const hack = new Plugin(result);
        const applied = browsers.some(browser => {
          return hack.targets.some(target => browser === target);
        });

        if (applied) {
          return list;
        }

        return [...list, hack];
      }, []);

      css.walk(node => {
        processors.forEach(proc => {
          if (!~proc.nodeTypes.indexOf(node.type)) {
            return;
          }

          if (opts.lint) {
            return proc.detectAndWarn(node);
          }

          return proc.detectAndResolve(node);
        });
      });
    }

  };
}

pluginCreator.detect = node => {
  return _plugins.default.some(Plugin => {
    const hack = new Plugin();
    return hack.any(node);
  });
};

pluginCreator.postcss = true;
var _default = pluginCreator;
exports.default = _default;
module.exports = exports.default;