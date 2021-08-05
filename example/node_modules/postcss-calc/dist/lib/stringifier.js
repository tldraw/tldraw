"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = _default;
const order = {
  "*": 0,
  "/": 0,
  "+": 1,
  "-": 1
};

function round(value, prec) {
  if (prec !== false) {
    const precision = Math.pow(10, prec);
    return Math.round(value * precision) / precision;
  }

  return value;
}

function stringify(node, prec) {
  switch (node.type) {
    case "MathExpression":
      {
        const {
          left,
          right,
          operator: op
        } = node;
        let str = "";

        if (left.type === 'MathExpression' && order[op] < order[left.operator]) {
          str += `(${stringify(left, prec)})`;
        } else {
          str += stringify(left, prec);
        }

        str += order[op] ? ` ${node.operator} ` : node.operator;

        if (right.type === 'MathExpression' && order[op] < order[right.operator]) {
          str += `(${stringify(right, prec)})`;
        } else {
          str += stringify(right, prec);
        }

        return str;
      }

    case 'Number':
      return round(node.value, prec);

    case 'Function':
      return node.value;

    default:
      return round(node.value, prec) + node.unit;
  }
}

function _default(calc, node, originalValue, options, result, item) {
  let str = stringify(node, options.precision);
  const shouldPrintCalc = node.type === "MathExpression" || node.type === "Function";

  if (shouldPrintCalc) {
    // if calc expression couldn't be resolved to a single value, re-wrap it as
    // a calc()
    str = `${calc}(${str})`; // if the warnWhenCannotResolve option is on, inform the user that the calc
    // expression could not be resolved to a single value

    if (options.warnWhenCannotResolve) {
      result.warn("Could not reduce expression: " + originalValue, {
        plugin: 'postcss-calc',
        node: item
      });
    }
  }

  return str;
}

module.exports = exports.default;