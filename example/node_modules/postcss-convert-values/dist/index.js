"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _postcssValueParser = _interopRequireWildcard(require("postcss-value-parser"));

var _convert = _interopRequireDefault(require("./lib/convert"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const LENGTH_UNITS = ['em', 'ex', 'ch', 'rem', 'vw', 'vh', 'vmin', 'vmax', 'cm', 'mm', 'q', 'in', 'pt', 'pc', 'px'];
/*
 * Numbers without digits after the dot are technically invalid,
 * but in that case css-value-parser returns the dot as part of the unit,
 * so we use this to remove the dot.
 */

function stripLeadingDot(item) {
  if (item.charCodeAt(0) === '.'.charCodeAt(0)) {
    return item.slice(1);
  } else {
    return item;
  }
}

function parseWord(node, opts, keepZeroUnit) {
  const pair = (0, _postcssValueParser.unit)(node.value);

  if (pair) {
    const num = Number(pair.number);
    const u = stripLeadingDot(pair.unit);

    if (num === 0) {
      node.value = 0 + (keepZeroUnit || !~LENGTH_UNITS.indexOf(u.toLowerCase()) && u !== '%' ? u : '');
    } else {
      node.value = (0, _convert.default)(num, u, opts);

      if (typeof opts.precision === 'number' && u.toLowerCase() === 'px' && ~pair.number.indexOf('.')) {
        const precision = Math.pow(10, opts.precision);
        node.value = Math.round(parseFloat(node.value) * precision) / precision + u;
      }
    }
  }
}

function clampOpacity(node) {
  const pair = (0, _postcssValueParser.unit)(node.value);

  if (!pair) {
    return;
  }

  let num = Number(pair.number);

  if (num > 1) {
    node.value = pair.unit === '%' ? num + pair.unit : 1 + pair.unit;
  } else if (num < 0) {
    node.value = 0 + pair.unit;
  }
}

function shouldKeepUnit(decl) {
  const {
    parent
  } = decl;
  const lowerCasedProp = decl.prop.toLowerCase();
  return ~decl.value.indexOf('%') && (lowerCasedProp === 'max-height' || lowerCasedProp === 'height') || parent.parent && parent.parent.name && parent.parent.name.toLowerCase() === 'keyframes' && lowerCasedProp === 'stroke-dasharray' || lowerCasedProp === 'stroke-dashoffset' || lowerCasedProp === 'stroke-width' || lowerCasedProp === 'line-height';
}

function transform(opts, decl) {
  const lowerCasedProp = decl.prop.toLowerCase();

  if (~lowerCasedProp.indexOf('flex') || lowerCasedProp.indexOf('--') === 0) {
    return;
  }

  decl.value = (0, _postcssValueParser.default)(decl.value).walk(node => {
    const lowerCasedValue = node.value.toLowerCase();

    if (node.type === 'word') {
      parseWord(node, opts, shouldKeepUnit(decl));

      if (lowerCasedProp === 'opacity' || lowerCasedProp === 'shape-image-threshold') {
        clampOpacity(node);
      }
    } else if (node.type === 'function') {
      if (lowerCasedValue === 'calc' || lowerCasedValue === 'min' || lowerCasedValue === 'max' || lowerCasedValue === 'clamp' || lowerCasedValue === 'hsl' || lowerCasedValue === 'hsla') {
        (0, _postcssValueParser.walk)(node.nodes, n => {
          if (n.type === 'word') {
            parseWord(n, opts, true);
          }
        });
        return false;
      }

      if (lowerCasedValue === 'url') {
        return false;
      }
    }
  }).toString();
}

const plugin = 'postcss-convert-values';

function pluginCreator(opts = {
  precision: false
}) {
  return {
    postcssPlugin: plugin,

    OnceExit(css) {
      css.walkDecls(transform.bind(null, opts));
    }

  };
}

pluginCreator.postcss = true;
var _default = pluginCreator;
exports.default = _default;
module.exports = exports.default;