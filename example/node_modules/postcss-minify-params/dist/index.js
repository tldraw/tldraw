"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _browserslist = _interopRequireDefault(require("browserslist"));

var _postcssValueParser = _interopRequireWildcard(require("postcss-value-parser"));

var _alphanumSort = _interopRequireDefault(require("alphanum-sort"));

var _uniqs = _interopRequireDefault(require("uniqs"));

var _cssnanoUtils = require("cssnano-utils");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Return the greatest common divisor
 * of two numbers.
 */
function gcd(a, b) {
  return b ? gcd(b, a % b) : a;
}

function aspectRatio(a, b) {
  const divisor = gcd(a, b);
  return [a / divisor, b / divisor];
}

function split(args) {
  return args.map(arg => (0, _postcssValueParser.stringify)(arg)).join('');
}

function removeNode(node) {
  node.value = '';
  node.type = 'word';
}

function transform(legacy, rule) {
  const ruleName = rule.name.toLowerCase(); // We should re-arrange parameters only for `@media` and `@supports` at-rules

  if (!rule.params || !['media', 'supports'].includes(ruleName)) {
    return;
  }

  const params = (0, _postcssValueParser.default)(rule.params);
  params.walk((node, index) => {
    if (node.type === 'div' || node.type === 'function') {
      node.before = node.after = '';

      if (node.type === 'function' && node.nodes[4] && node.nodes[0].value.toLowerCase().indexOf('-aspect-ratio') === 3) {
        const [a, b] = aspectRatio(node.nodes[2].value, node.nodes[4].value);
        node.nodes[2].value = a;
        node.nodes[4].value = b;
      }
    } else if (node.type === 'space') {
      node.value = ' ';
    } else {
      const prevWord = params.nodes[index - 2];

      if (node.value.toLowerCase() === 'all' && rule.name.toLowerCase() === 'media' && !prevWord) {
        const nextWord = params.nodes[index + 2];

        if (!legacy || nextWord) {
          removeNode(node);
        }

        if (nextWord && nextWord.value.toLowerCase() === 'and') {
          const nextSpace = params.nodes[index + 1];
          const secondSpace = params.nodes[index + 3];
          removeNode(nextWord);
          removeNode(nextSpace);
          removeNode(secondSpace);
        }
      }
    }
  }, true);
  rule.params = (0, _alphanumSort.default)((0, _uniqs.default)((0, _cssnanoUtils.getArguments)(params).map(split)), {
    insensitive: true
  }).join();

  if (!rule.params.length) {
    rule.raws.afterName = '';
  }
}

function hasAllBug(browser) {
  return ~['ie 10', 'ie 11'].indexOf(browser);
}

function pluginCreator(options = {}) {
  const browsers = (0, _browserslist.default)(null, {
    stats: options.stats,
    path: __dirname,
    env: options.env
  });
  return {
    postcssPlugin: 'postcss-minify-params',

    OnceExit(css) {
      css.walkAtRules(transform.bind(null, browsers.some(hasAllBug)));
    }

  };
}

pluginCreator.postcss = true;
var _default = pluginCreator;
exports.default = _default;
module.exports = exports.default;