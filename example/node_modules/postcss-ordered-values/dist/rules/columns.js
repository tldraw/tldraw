"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.columnsRule = exports.column = void 0;

var _postcssValueParser = require("postcss-value-parser");

var _border = _interopRequireDefault(require("./border.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function hasUnit(value) {
  const parsedVal = (0, _postcssValueParser.unit)(value);
  return parsedVal && parsedVal.unit !== '';
}

const column = columns => {
  const widths = [];
  const other = [];
  columns.walk(node => {
    const {
      type,
      value
    } = node;

    if (type === 'word') {
      if (hasUnit(value)) {
        widths.push(value);
      } else {
        other.push(value);
      }
    }
  }); // only transform if declaration is not invalid or a single value

  if (other.length === 1 && widths.length === 1) {
    return `${widths[0].trimStart()} ${other[0].trimStart()}`;
  }

  return columns;
};

exports.column = column;
const columnsRule = _border.default;
exports.columnsRule = columnsRule;