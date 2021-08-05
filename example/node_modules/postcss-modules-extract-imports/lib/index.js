'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _postcss = require('postcss');

var _postcss2 = _interopRequireDefault(_postcss);

var declWhitelist = ['composes'],
    declFilter = new RegExp('^(' + declWhitelist.join('|') + ')$'),
    matchImports = /^(.+?)\s+from\s+(?:"([^"]+)"|'([^']+)'|(global))$/,
    icssImport = /^:import\((?:"([^"]+)"|'([^']+)')\)/;

var processor = _postcss2['default'].plugin('modules-extract-imports', function (options) {
  return function (css) {
    var imports = {},
        importIndex = 0,
        createImportedName = options && options.createImportedName || function (importName /*, path*/) {
      return 'i__imported_' + importName.replace(/\W/g, '_') + '_' + importIndex++;
    };

    // Find any declaration that supports imports
    css.walkDecls(declFilter, function (decl) {
      var matches = decl.value.match(matchImports);
      var tmpSymbols = undefined;
      if (matches) {
        var _matches = _slicedToArray(matches, 5);

        var /*match*/symbols = _matches[1];
        var doubleQuotePath = _matches[2];
        var singleQuotePath = _matches[3];
        var _global = _matches[4];

        if (_global) {
          // Composing globals simply means changing these classes to wrap them in global(name)
          tmpSymbols = symbols.split(/\s+/).map(function (s) {
            return 'global(' + s + ')';
          });
        } else {
          (function () {
            var path = doubleQuotePath || singleQuotePath;
            imports[path] = imports[path] || {};
            tmpSymbols = symbols.split(/\s+/).map(function (s) {
              if (!imports[path][s]) {
                imports[path][s] = createImportedName(s, path);
              }
              return imports[path][s];
            });
          })();
        }
        decl.value = tmpSymbols.join(' ');
      }
    });

    // If we've found any imports, insert or append :import rules
    var existingImports = {};
    css.walkRules(function (rule) {
      var matches = icssImport.exec(rule.selector);
      if (matches) {
        var _matches2 = _slicedToArray(matches, 3);

        var /*match*/doubleQuotePath = _matches2[1];
        var singleQuotePath = _matches2[2];

        existingImports[doubleQuotePath || singleQuotePath] = rule;
      }
    });

    Object.keys(imports).reverse().forEach(function (path) {

      var rule = existingImports[path];
      if (!rule) {
        rule = _postcss2['default'].rule({
          selector: ':import("' + path + '")',
          raws: { after: "\n" }
        });
        css.prepend(rule);
      }
      Object.keys(imports[path]).forEach(function (importedSymbol) {
        rule.append(_postcss2['default'].decl({
          value: importedSymbol,
          prop: imports[path][importedSymbol],
          raws: { before: "\n  " }
        }));
      });
    });
  };
});

exports['default'] = processor;
module.exports = exports['default'];