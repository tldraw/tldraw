"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _browserslist = _interopRequireDefault(require("browserslist"));

var _caniuseApi = require("caniuse-api");

var _postcssValueParser = _interopRequireWildcard(require("postcss-value-parser"));

var _minifyColor = _interopRequireDefault(require("./minifyColor"));

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function walk(parent, callback) {
  parent.nodes.forEach((node, index) => {
    const bubble = callback(node, index, parent);

    if (node.nodes && bubble !== false) {
      walk(node, callback);
    }
  });
}
/*
 * IE 8 & 9 do not properly handle clicks on elements
 * with a `transparent` `background-color`.
 *
 * https://developer.mozilla.org/en-US/docs/Web/Events/click#Internet_Explorer
 */


function hasTransparentBug(browser) {
  return ~['ie 8', 'ie 9'].indexOf(browser);
}

function isMathFunctionNode(node) {
  if (node.type !== 'function') {
    return false;
  }

  return ['calc', 'min', 'max', 'clamp'].includes(node.value.toLowerCase());
}

function transform(value, options) {
  const parsed = (0, _postcssValueParser.default)(value);
  walk(parsed, (node, index, parent) => {
    if (node.type === 'function') {
      if (/^(rgb|hsl)a?$/i.test(node.value)) {
        const {
          value: originalValue
        } = node;
        node.value = (0, _minifyColor.default)((0, _postcssValueParser.stringify)(node), options);
        node.type = 'word';
        const next = parent.nodes[index + 1];

        if (node.value !== originalValue && next && (next.type === 'word' || next.type === 'function')) {
          parent.nodes.splice(index + 1, 0, {
            type: 'space',
            value: ' '
          });
        }
      } else if (isMathFunctionNode(node)) {
        return false;
      }
    } else if (node.type === 'word') {
      node.value = (0, _minifyColor.default)(node.value, options);
    }
  });
  return parsed.toString();
}

function pluginCreator() {
  return {
    postcssPlugin: 'postcss-colormin',

    prepare(result) {
      const resultOpts = result.opts || {};
      const browsers = (0, _browserslist.default)(null, {
        stats: resultOpts.stats,
        path: __dirname,
        env: resultOpts.env
      });
      const options = {
        supportsTransparent: browsers.some(hasTransparentBug) === false,
        supportsAlphaHex: (0, _caniuseApi.isSupported)('css-rrggbbaa', browsers)
      };
      const cache = {};
      return {
        OnceExit(css) {
          css.walkDecls(decl => {
            if (/^(composes|font|filter|-webkit-tap-highlight-color)/i.test(decl.prop)) {
              return;
            }

            const value = decl.value;

            if (!value) {
              return;
            }

            const cacheKey = JSON.stringify({
              value,
              options,
              browsers
            });

            if (cache[cacheKey]) {
              decl.value = cache[cacheKey];
              return;
            }

            const newValue = transform(value, options);
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