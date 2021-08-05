"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _icssReplaceSymbols = require('icss-replace-symbols');

var _icssReplaceSymbols2 = _interopRequireDefault(_icssReplaceSymbols);

var importRegexp = /^:import\((.+)\)$/;

var Parser = (function () {
  function Parser(pathFetcher, trace) {
    _classCallCheck(this, Parser);

    this.pathFetcher = pathFetcher;
    this.plugin = this.plugin.bind(this);
    this.exportTokens = {};
    this.translations = {};
    this.trace = trace;
  }

  _createClass(Parser, [{
    key: "plugin",
    value: function plugin(css, result) {
      var _this = this;

      return Promise.all(this.fetchAllImports(css)).then(function (_) {
        return _this.linkImportedSymbols(css);
      }).then(function (_) {
        return _this.extractExports(css);
      });
    }
  }, {
    key: "fetchAllImports",
    value: function fetchAllImports(css) {
      var _this2 = this;

      var imports = [];
      css.each(function (node) {
        if (node.type == "rule" && node.selector.match(importRegexp)) {
          imports.push(_this2.fetchImport(node, css.source.input.from, imports.length));
        }
      });
      return imports;
    }
  }, {
    key: "linkImportedSymbols",
    value: function linkImportedSymbols(css) {
      (0, _icssReplaceSymbols2["default"])(css, this.translations);
    }
  }, {
    key: "extractExports",
    value: function extractExports(css) {
      var _this3 = this;

      css.each(function (node) {
        if (node.type == "rule" && node.selector == ":export") _this3.handleExport(node);
      });
    }
  }, {
    key: "handleExport",
    value: function handleExport(exportNode) {
      var _this4 = this;

      exportNode.each(function (decl) {
        if (decl.type == 'decl') {
          Object.keys(_this4.translations).forEach(function (translation) {
            decl.value = decl.value.replace(translation, _this4.translations[translation]);
          });
          _this4.exportTokens[decl.prop] = decl.value;
        }
      });
      exportNode.remove();
    }
  }, {
    key: "fetchImport",
    value: function fetchImport(importNode, relativeTo, depNr) {
      var _this5 = this;

      var file = importNode.selector.match(importRegexp)[1],
          depTrace = this.trace + String.fromCharCode(depNr);
      return this.pathFetcher(file, relativeTo, depTrace).then(function (exports) {
        importNode.each(function (decl) {
          if (decl.type == 'decl') {
            _this5.translations[decl.prop] = exports[decl.value];
          }
        });
        importNode.remove();
      }, function (err) {
        return console.log(err);
      });
    }
  }]);

  return Parser;
})();

exports["default"] = Parser;
module.exports = exports["default"];