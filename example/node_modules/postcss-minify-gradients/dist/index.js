"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _postcssValueParser = _interopRequireWildcard(require("postcss-value-parser"));

var _cssnanoUtils = require("cssnano-utils");

var _isColorStop = _interopRequireDefault(require("is-color-stop"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const angles = {
  top: '0deg',
  right: '90deg',
  bottom: '180deg',
  left: '270deg'
};

function isLessThan(a, b) {
  return a.unit.toLowerCase() === b.unit.toLowerCase() && parseFloat(a.number) >= parseFloat(b.number);
}

function optimise(decl) {
  const value = decl.value;

  if (!value) {
    return;
  }

  const normalizedValue = value.toLowerCase();

  if (normalizedValue.includes('var(') || normalizedValue.includes('env(')) {
    return;
  }

  if (!normalizedValue.includes('gradient')) {
    return;
  }

  decl.value = (0, _postcssValueParser.default)(value).walk(node => {
    if (node.type !== 'function' || !node.nodes.length) {
      return false;
    }

    const lowerCasedValue = node.value.toLowerCase();

    if (lowerCasedValue === 'linear-gradient' || lowerCasedValue === 'repeating-linear-gradient' || lowerCasedValue === '-webkit-linear-gradient' || lowerCasedValue === '-webkit-repeating-linear-gradient') {
      let args = (0, _cssnanoUtils.getArguments)(node);

      if (node.nodes[0].value.toLowerCase() === 'to' && args[0].length === 3) {
        node.nodes = node.nodes.slice(2);
        node.nodes[0].value = angles[node.nodes[0].value.toLowerCase()];
      }

      let lastStop = null;
      args.forEach((arg, index) => {
        if (!arg[2]) {
          return;
        }

        let isFinalStop = index === args.length - 1;
        let thisStop = (0, _postcssValueParser.unit)(arg[2].value);

        if (lastStop === null) {
          lastStop = thisStop;

          if (!isFinalStop && lastStop && lastStop.number === '0' && lastStop.unit.toLowerCase() !== 'deg') {
            arg[1].value = arg[2].value = '';
          }

          return;
        }

        if (lastStop && thisStop && isLessThan(lastStop, thisStop)) {
          arg[2].value = 0;
        }

        lastStop = thisStop;

        if (isFinalStop && arg[2].value === '100%') {
          arg[1].value = arg[2].value = '';
        }
      });
      return false;
    }

    if (lowerCasedValue === 'radial-gradient' || lowerCasedValue === 'repeating-radial-gradient') {
      let args = (0, _cssnanoUtils.getArguments)(node);
      let lastStop;
      const hasAt = args[0].find(n => n.value.toLowerCase() === 'at');
      args.forEach((arg, index) => {
        if (!arg[2] || !index && hasAt) {
          return;
        }

        let thisStop = (0, _postcssValueParser.unit)(arg[2].value);

        if (!lastStop) {
          lastStop = thisStop;
          return;
        }

        if (lastStop && thisStop && isLessThan(lastStop, thisStop)) {
          arg[2].value = 0;
        }

        lastStop = thisStop;
      });
      return false;
    }

    if (lowerCasedValue === '-webkit-radial-gradient' || lowerCasedValue === '-webkit-repeating-radial-gradient') {
      let args = (0, _cssnanoUtils.getArguments)(node);
      let lastStop;
      args.forEach(arg => {
        let color;
        let stop;

        if (arg[2] !== undefined) {
          if (arg[0].type === 'function') {
            color = `${arg[0].value}(${(0, _postcssValueParser.stringify)(arg[0].nodes)})`;
          } else {
            color = arg[0].value;
          }

          if (arg[2].type === 'function') {
            stop = `${arg[2].value}(${(0, _postcssValueParser.stringify)(arg[2].nodes)})`;
          } else {
            stop = arg[2].value;
          }
        } else {
          if (arg[0].type === 'function') {
            color = `${arg[0].value}(${(0, _postcssValueParser.stringify)(arg[0].nodes)})`;
          }

          color = arg[0].value;
        }

        color = color.toLowerCase();
        const colorStop = stop || stop === 0 ? (0, _isColorStop.default)(color, stop.toLowerCase()) : (0, _isColorStop.default)(color);

        if (!colorStop || !arg[2]) {
          return;
        }

        let thisStop = (0, _postcssValueParser.unit)(arg[2].value);

        if (!lastStop) {
          lastStop = thisStop;
          return;
        }

        if (lastStop && thisStop && isLessThan(lastStop, thisStop)) {
          arg[2].value = 0;
        }

        lastStop = thisStop;
      });
      return false;
    }
  }).toString();
}

function pluginCreator() {
  return {
    postcssPlugin: 'postcss-minify-gradients',

    OnceExit(css) {
      css.walkDecls(optimise);
    }

  };
}

pluginCreator.postcss = true;
var _default = pluginCreator;
exports.default = _default;
module.exports = exports.default;