"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _browserslist = _interopRequireDefault(require("browserslist"));

var _caniuseApi = require("caniuse-api");

var _fromInitial = _interopRequireDefault(require("../data/fromInitial.json"));

var _toInitial = _interopRequireDefault(require("../data/toInitial.json"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const initial = 'initial'; // In most of the browser including chrome the initial for `writing-mode` is not `horizontal-tb`. Ref https://github.com/cssnano/cssnano/pull/905

const defaultIgnoreProps = ['writing-mode'];

function pluginCreator() {
  return {
    postcssPlugin: 'postcss-reduce-initial',

    prepare(result) {
      const resultOpts = result.opts || {};
      const browsers = (0, _browserslist.default)(null, {
        stats: resultOpts.stats,
        path: __dirname,
        env: resultOpts.env
      });
      const initialSupport = (0, _caniuseApi.isSupported)('css-initial-value', browsers);
      return {
        OnceExit(css) {
          css.walkDecls(decl => {
            const lowerCasedProp = decl.prop.toLowerCase();
            const ignoreProp = defaultIgnoreProps.concat(resultOpts.ignore || []);

            if (ignoreProp.includes(lowerCasedProp)) {
              return;
            }

            if (initialSupport && Object.prototype.hasOwnProperty.call(_toInitial.default, lowerCasedProp) && decl.value.toLowerCase() === _toInitial.default[lowerCasedProp]) {
              decl.value = initial;
              return;
            }

            if (decl.value.toLowerCase() !== initial || !_fromInitial.default[lowerCasedProp]) {
              return;
            }

            decl.value = _fromInitial.default[lowerCasedProp];
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