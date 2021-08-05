"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _postcssValueParser = _interopRequireDefault(require("postcss-value-parser"));

var _svgo = require("svgo");

var _url = require("./lib/url");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const PLUGIN = 'postcss-svgo';
const dataURI = /data:image\/svg\+xml(;((charset=)?utf-8|base64))?,/i;
const dataURIBase64 = /data:image\/svg\+xml;base64,/i;
/**
 * @param {string} input the SVG string
 * @param {boolean} encode whether to encode the result
 * @return {object} the minification result
 */

function minifySVG(input, opts) {
  let svg = input;
  let decodedUri, isUriEncoded;

  try {
    decodedUri = (0, _url.decode)(input);
    isUriEncoded = decodedUri !== input;
  } catch (e) {
    // Swallow exception if we cannot decode the value
    isUriEncoded = false;
  }

  if (isUriEncoded) {
    svg = decodedUri;
  }

  if (opts.encode !== undefined) {
    isUriEncoded = opts.encode;
  }

  const result = (0, _svgo.optimize)(svg, opts);

  if (result.error) {
    throw new Error(result.error);
  }

  return {
    result: result.data,
    isUriEncoded
  };
}

function minify(decl, opts, postcssResult) {
  const parsed = (0, _postcssValueParser.default)(decl.value);
  decl.value = parsed.walk(node => {
    if (node.type !== 'function' || node.value.toLowerCase() !== 'url' || !node.nodes.length) {
      return;
    }

    let {
      value,
      quote
    } = node.nodes[0];
    let optimizedValue;

    try {
      if (dataURIBase64.test(value)) {
        const url = new URL(value);
        const base64String = `${url.protocol}${url.pathname}`.replace(dataURI, '');
        const svg = Buffer.from(base64String, 'base64').toString('utf8');
        const {
          result
        } = minifySVG(svg, opts);
        const data = Buffer.from(result).toString('base64');
        optimizedValue = 'data:image/svg+xml;base64,' + data + url.hash;
      } else if (dataURI.test(value)) {
        const svg = value.replace(dataURI, '');
        const {
          result,
          isUriEncoded
        } = minifySVG(svg, opts);
        let data = isUriEncoded ? (0, _url.encode)(result) : result; // Should always encode # otherwise we yield a broken SVG
        // in Firefox (works in Chrome however). See this issue:
        // https://github.com/cssnano/cssnano/issues/245

        data = data.replace(/#/g, '%23');
        optimizedValue = 'data:image/svg+xml;charset=utf-8,' + data;
        quote = isUriEncoded ? '"' : "'";
      } else {
        return;
      }
    } catch (error) {
      decl.warn(postcssResult, `${error}`);
      return;
    }

    node.nodes[0] = Object.assign({}, node.nodes[0], {
      value: optimizedValue,
      quote: quote,
      type: 'string',
      before: '',
      after: ''
    });
    return false;
  });
  decl.value = decl.value.toString();
}

function pluginCreator(opts = {}) {
  return {
    postcssPlugin: PLUGIN,

    OnceExit(css, {
      result
    }) {
      css.walkDecls(decl => {
        if (!dataURI.test(decl.value)) {
          return;
        }

        minify(decl, opts, result);
      });
    }

  };
}

pluginCreator.postcss = true;
var _default = pluginCreator;
exports.default = _default;
module.exports = exports.default;