'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _postcss = require('postcss');

var _postcss2 = _interopRequireDefault(_postcss);

var _postcssModulesLocalByDefault = require('postcss-modules-local-by-default');

var _postcssModulesLocalByDefault2 = _interopRequireDefault(_postcssModulesLocalByDefault);

var _postcssModulesExtractImports = require('postcss-modules-extract-imports');

var _postcssModulesExtractImports2 = _interopRequireDefault(_postcssModulesExtractImports);

var _postcssModulesScope = require('postcss-modules-scope');

var _postcssModulesScope2 = _interopRequireDefault(_postcssModulesScope);

var _postcssModulesValues = require('postcss-modules-values');

var _postcssModulesValues2 = _interopRequireDefault(_postcssModulesValues);

var _parser = require('./parser');

var _parser2 = _interopRequireDefault(_parser);

var Core = (function () {
  function Core(plugins) {
    _classCallCheck(this, Core);

    this.plugins = plugins || Core.defaultPlugins;
  }

  // These four plugins are aliased under this package for simplicity.

  _createClass(Core, [{
    key: 'load',
    value: function load(sourceString, sourcePath, trace, pathFetcher) {
      var parser = new _parser2['default'](pathFetcher, trace);

      return (0, _postcss2['default'])(this.plugins.concat([parser.plugin])).process(sourceString, { from: "/" + sourcePath }).then(function (result) {
        return { injectableSource: result.css, exportTokens: parser.exportTokens };
      });
    }
  }]);

  return Core;
})();

exports['default'] = Core;
Core.values = _postcssModulesValues2['default'];
Core.localByDefault = _postcssModulesLocalByDefault2['default'];
Core.extractImports = _postcssModulesExtractImports2['default'];
Core.scope = _postcssModulesScope2['default'];

Core.defaultPlugins = [_postcssModulesValues2['default'], _postcssModulesLocalByDefault2['default'], _postcssModulesExtractImports2['default'], _postcssModulesScope2['default']];
module.exports = exports['default'];