"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _path = _interopRequireDefault(require("path"));

var _postcssValueParser = _interopRequireDefault(require("postcss-value-parser"));

var _normalizeUrl = _interopRequireDefault(require("normalize-url"));

var _isAbsoluteUrl = _interopRequireDefault(require("is-absolute-url"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const multiline = /\\[\r\n]/; // eslint-disable-next-line no-useless-escape

const escapeChars = /([\s\(\)"'])/g;

function convert(url, options) {
  if ((0, _isAbsoluteUrl.default)(url) || url.startsWith('//')) {
    let normalizedURL = null;

    try {
      normalizedURL = (0, _normalizeUrl.default)(url, options);
    } catch (e) {
      normalizedURL = url;
    }

    return normalizedURL;
  } // `path.normalize` always returns backslashes on Windows, need replace in `/`


  return _path.default.normalize(url).replace(new RegExp('\\' + _path.default.sep, 'g'), '/');
}

function transformNamespace(rule) {
  rule.params = (0, _postcssValueParser.default)(rule.params).walk(node => {
    if (node.type === 'function' && node.value.toLowerCase() === 'url' && node.nodes.length) {
      node.type = 'string';
      node.quote = node.nodes[0].quote || '"';
      node.value = node.nodes[0].value;
    }

    if (node.type === 'string') {
      node.value = node.value.trim();
    }

    return false;
  }).toString();
}

function transformDecl(decl, opts) {
  decl.value = (0, _postcssValueParser.default)(decl.value).walk(node => {
    if (node.type !== 'function' || node.value.toLowerCase() !== 'url') {
      return false;
    }

    node.before = node.after = '';

    if (!node.nodes.length) {
      return false;
    }

    let url = node.nodes[0];
    let escaped;
    url.value = url.value.trim().replace(multiline, ''); // Skip empty URLs
    // Empty URL function equals request to current stylesheet where it is declared

    if (url.value.length === 0) {
      url.quote = '';
      return false;
    }

    if (/^data:(.*)?,/i.test(url.value)) {
      return false;
    }

    if (!/^.+-extension:\//i.test(url.value)) {
      url.value = convert(url.value, opts);
    }

    if (escapeChars.test(url.value) && url.type === 'string') {
      escaped = url.value.replace(escapeChars, '\\$1');

      if (escaped.length < url.value.length + 2) {
        url.value = escaped;
        url.type = 'word';
      }
    } else {
      url.type = 'word';
    }

    return false;
  }).toString();
}

function pluginCreator(opts) {
  opts = Object.assign({}, {
    normalizeProtocol: false,
    stripHash: false,
    stripWWW: false,
    stripTextFragment: false
  }, opts);
  return {
    postcssPlugin: 'postcss-normalize-url',

    OnceExit(css) {
      css.walk(node => {
        if (node.type === 'decl') {
          return transformDecl(node, opts);
        } else if (node.type === 'atrule' && node.name.toLowerCase() === 'namespace') {
          return transformNamespace(node);
        }
      });
    }

  };
}

pluginCreator.postcss = true;
var _default = pluginCreator;
exports.default = _default;
module.exports = exports.default;