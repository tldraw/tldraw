"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _convertUnit = _interopRequireDefault(require("./convertUnit"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function isValueType(type) {
  switch (type) {
    case 'LengthValue':
    case 'AngleValue':
    case 'TimeValue':
    case 'FrequencyValue':
    case 'ResolutionValue':
    case 'EmValue':
    case 'ExValue':
    case 'ChValue':
    case 'RemValue':
    case 'VhValue':
    case 'VwValue':
    case 'VminValue':
    case 'VmaxValue':
    case 'PercentageValue':
    case 'Number':
      return true;
  }

  return false;
}

function flip(operator) {
  return operator === '+' ? '-' : '+';
}

function isAddSubOperator(operator) {
  return operator === '+' || operator === '-';
}

function collectAddSubItems(preOperator, node, collected, precision) {
  if (!isAddSubOperator(preOperator)) {
    throw new Error(`invalid operator ${preOperator}`);
  }

  const type = node.type;

  if (isValueType(type)) {
    const itemIndex = collected.findIndex(x => x.node.type === type);

    if (itemIndex >= 0) {
      if (node.value === 0) {
        return;
      }

      const {
        left: reducedNode,
        right: current
      } = covertNodesUnits(collected[itemIndex].node, node, precision);

      if (collected[itemIndex].preOperator === '-') {
        collected[itemIndex].preOperator = '+';
        reducedNode.value *= -1;
      }

      if (preOperator === "+") {
        reducedNode.value += current.value;
      } else {
        reducedNode.value -= current.value;
      } // make sure reducedNode.value >= 0


      if (reducedNode.value >= 0) {
        collected[itemIndex] = {
          node: reducedNode,
          preOperator: '+'
        };
      } else {
        reducedNode.value *= -1;
        collected[itemIndex] = {
          node: reducedNode,
          preOperator: '-'
        };
      }
    } else {
      // make sure node.value >= 0
      if (node.value >= 0) {
        collected.push({
          node,
          preOperator
        });
      } else {
        node.value *= -1;
        collected.push({
          node,
          preOperator: flip(preOperator)
        });
      }
    }
  } else if (type === "MathExpression") {
    if (isAddSubOperator(node.operator)) {
      collectAddSubItems(preOperator, node.left, collected, precision);
      const collectRightOperator = preOperator === '-' ? flip(node.operator) : node.operator;
      collectAddSubItems(collectRightOperator, node.right, collected, precision);
    } else {
      // * or /
      const reducedNode = reduce(node, precision); // prevent infinite recursive call

      if (reducedNode.type !== "MathExpression" || isAddSubOperator(reducedNode.operator)) {
        collectAddSubItems(preOperator, reducedNode, collected, precision);
      } else {
        collected.push({
          node: reducedNode,
          preOperator
        });
      }
    }
  } else {
    collected.push({
      node,
      preOperator
    });
  }
}

function reduceAddSubExpression(node, precision) {
  const collected = [];
  collectAddSubItems('+', node, collected, precision);
  const withoutZeroItem = collected.filter(item => !(isValueType(item.node.type) && item.node.value === 0));
  const firstNonZeroItem = withoutZeroItem[0]; // could be undefined
  // prevent producing "calc(-var(--a))" or "calc()"
  // which is invalid css

  if (!firstNonZeroItem || firstNonZeroItem.preOperator === '-' && !isValueType(firstNonZeroItem.node.type)) {
    const firstZeroItem = collected.find(item => isValueType(item.node.type) && item.node.value === 0);
    withoutZeroItem.unshift(firstZeroItem);
  } // make sure the preOperator of the first item is +


  if (withoutZeroItem[0].preOperator === '-' && isValueType(withoutZeroItem[0].node.type)) {
    withoutZeroItem[0].node.value *= -1;
    withoutZeroItem[0].preOperator = '+';
  }

  let root = withoutZeroItem[0].node;

  for (let i = 1; i < withoutZeroItem.length; i++) {
    root = {
      type: 'MathExpression',
      operator: withoutZeroItem[i].preOperator,
      left: root,
      right: withoutZeroItem[i].node
    };
  }

  return root;
}

function reduceDivisionExpression(node) {
  if (!isValueType(node.right.type)) {
    return node;
  }

  if (node.right.type !== 'Number') {
    throw new Error(`Cannot divide by "${node.right.unit}", number expected`);
  }

  return applyNumberDivision(node.left, node.right.value);
} // apply (expr) / number


function applyNumberDivision(node, divisor) {
  if (divisor === 0) {
    throw new Error('Cannot divide by zero');
  }

  if (isValueType(node.type)) {
    node.value /= divisor;
    return node;
  }

  if (node.type === "MathExpression" && isAddSubOperator(node.operator)) {
    // turn (a + b) / num into a/num + b/num
    // is good for further reduction
    // checkout the test case
    // "should reduce division before reducing additions"
    return {
      type: "MathExpression",
      operator: node.operator,
      left: applyNumberDivision(node.left, divisor),
      right: applyNumberDivision(node.right, divisor)
    };
  } // it is impossible to reduce it into a single value
  // .e.g the node contains css variable
  // so we just preserve the division and let browser do it


  return {
    type: "MathExpression",
    operator: '/',
    left: node,
    right: {
      type: "Number",
      value: divisor
    }
  };
}

function reduceMultiplicationExpression(node) {
  // (expr) * number
  if (node.right.type === 'Number') {
    return applyNumberMultiplication(node.left, node.right.value);
  } // number * (expr)


  if (node.left.type === 'Number') {
    return applyNumberMultiplication(node.right, node.left.value);
  }

  return node;
} // apply (expr) / number


function applyNumberMultiplication(node, multiplier) {
  if (isValueType(node.type)) {
    node.value *= multiplier;
    return node;
  }

  if (node.type === "MathExpression" && isAddSubOperator(node.operator)) {
    // turn (a + b) * num into a*num + b*num
    // is good for further reduction
    // checkout the test case
    // "should reduce multiplication before reducing additions"
    return {
      type: "MathExpression",
      operator: node.operator,
      left: applyNumberMultiplication(node.left, multiplier),
      right: applyNumberMultiplication(node.right, multiplier)
    };
  } // it is impossible to reduce it into a single value
  // .e.g the node contains css variable
  // so we just preserve the division and let browser do it


  return {
    type: "MathExpression",
    operator: '*',
    left: node,
    right: {
      type: "Number",
      value: multiplier
    }
  };
}

function covertNodesUnits(left, right, precision) {
  switch (left.type) {
    case 'LengthValue':
    case 'AngleValue':
    case 'TimeValue':
    case 'FrequencyValue':
    case 'ResolutionValue':
      if (right.type === left.type && right.unit && left.unit) {
        const converted = (0, _convertUnit.default)(right.value, right.unit, left.unit, precision);
        right = {
          type: left.type,
          value: converted,
          unit: left.unit
        };
      }

      return {
        left,
        right
      };

    default:
      return {
        left,
        right
      };
  }
}

function reduce(node, precision) {
  if (node.type === "MathExpression") {
    if (isAddSubOperator(node.operator)) {
      // reduceAddSubExpression will call reduce recursively
      return reduceAddSubExpression(node, precision);
    }

    node.left = reduce(node.left, precision);
    node.right = reduce(node.right, precision);

    switch (node.operator) {
      case "/":
        return reduceDivisionExpression(node, precision);

      case "*":
        return reduceMultiplicationExpression(node, precision);
    }

    return node;
  }

  return node;
}

var _default = reduce;
exports.default = _default;
module.exports = exports.default;