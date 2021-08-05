"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _posthtml = _interopRequireDefault(require("posthtml"));

var _safe = _interopRequireDefault(require("./presets/safe"));

var _ampSafe = _interopRequireDefault(require("./presets/ampSafe"));

var _max = _interopRequireDefault(require("./presets/max"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function htmlnano(options = {}, preset = _safe.default) {
  return function minifier(tree) {
    options = { ...preset,
      ...options
    };
    let promise = Promise.resolve(tree);

    for (const [moduleName, moduleOptions] of Object.entries(options)) {
      if (!moduleOptions) {
        // The module is disabled
        continue;
      }

      if (_safe.default[moduleName] === undefined) {
        throw new Error('Module "' + moduleName + '" is not defined');
      }

      let module = require('./modules/' + moduleName);

      promise = promise.then(tree => module.default(tree, options, moduleOptions));
    }

    return promise;
  };
}

htmlnano.process = function (html, options, preset, postHtmlOptions) {
  return (0, _posthtml.default)([htmlnano(options, preset)]).process(html, postHtmlOptions);
};

htmlnano.presets = {
  safe: _safe.default,
  ampSafe: _ampSafe.default,
  max: _max.default
};
var _default = htmlnano;
exports.default = _default;