"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = normalizeBoxShadow;

var _postcssValueParser = require("postcss-value-parser");

var _cssnanoUtils = require("cssnano-utils");

var _addSpace = _interopRequireDefault(require("../lib/addSpace"));

var _getValue = _interopRequireDefault(require("../lib/getValue"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// box-shadow: inset? && <length>{2,4} && <color>?
function normalizeBoxShadow(parsed) {
  let args = (0, _cssnanoUtils.getArguments)(parsed);
  let abort = false;
  let values = args.reduce((list, arg) => {
    let val = [];
    let state = {
      inset: [],
      color: []
    };
    arg.forEach(node => {
      const {
        type,
        value
      } = node;

      if (type === 'function' && ~value.toLowerCase().indexOf('calc')) {
        abort = true;
        return;
      }

      if (type === 'space') {
        return;
      }

      if ((0, _postcssValueParser.unit)(value)) {
        val = [...val, node, (0, _addSpace.default)()];
      } else if (value.toLowerCase() === 'inset') {
        state.inset = [...state.inset, node, (0, _addSpace.default)()];
      } else {
        state.color = [...state.color, node, (0, _addSpace.default)()];
      }
    });
    return [...list, [...state.inset, ...val, ...state.color]];
  }, []);

  if (abort) {
    return parsed.toString();
  }

  return (0, _getValue.default)(values);
}

module.exports = exports.default;