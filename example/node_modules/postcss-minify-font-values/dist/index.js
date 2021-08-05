"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _postcssValueParser = _interopRequireDefault(require("postcss-value-parser"));

var _minifyWeight = _interopRequireDefault(require("./lib/minify-weight"));

var _minifyFamily = _interopRequireDefault(require("./lib/minify-family"));

var _minifyFont = _interopRequireDefault(require("./lib/minify-font"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function hasVariableFunction(value) {
  const lowerCasedValue = value.toLowerCase();
  return lowerCasedValue.includes('var(') || lowerCasedValue.includes('env(');
}

function transform(prop, value, opts) {
  let lowerCasedProp = prop.toLowerCase();

  if (lowerCasedProp === 'font-weight' && !hasVariableFunction(value)) {
    return (0, _minifyWeight.default)(value);
  } else if (lowerCasedProp === 'font-family' && !hasVariableFunction(value)) {
    const tree = (0, _postcssValueParser.default)(value);
    tree.nodes = (0, _minifyFamily.default)(tree.nodes, opts);
    return tree.toString();
  } else if (lowerCasedProp === 'font') {
    const tree = (0, _postcssValueParser.default)(value);
    tree.nodes = (0, _minifyFont.default)(tree.nodes, opts);
    return tree.toString();
  }

  return value;
}

function pluginCreator(opts) {
  opts = Object.assign({}, {
    removeAfterKeyword: false,
    removeDuplicates: true,
    removeQuotes: true
  }, opts);
  return {
    postcssPlugin: 'postcss-minify-font-values',

    prepare() {
      const cache = {};
      return {
        OnceExit(css) {
          css.walkDecls(/font/i, decl => {
            const value = decl.value;

            if (!value) {
              return;
            }

            const prop = decl.prop;
            const cacheKey = `${prop}|${value}`;

            if (cache[cacheKey]) {
              decl.value = cache[cacheKey];
              return;
            }

            const newValue = transform(prop, value, opts);
            decl.value = newValue;
            cache[cacheKey] = newValue;
          });
        }

      };
    }

  };
}

pluginCreator.postcss = true;
var _default = pluginCreator;
exports.default = _default;
module.exports = exports.default;