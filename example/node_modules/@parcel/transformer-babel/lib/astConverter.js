"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.babel7toBabel6 = babel7toBabel6;
exports.babel6toBabel7 = babel6toBabel7;

function _traverse() {
  const data = _interopRequireDefault(require("@babel/traverse"));

  _traverse = function () {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Convert between babel 7 and babel 6 AST
// More info on the AST Changes: https://babeljs.io/docs/en/v7-migration-api#ast-changes
function babel7toBabel6(ast) {
  const visitor = {
    ArrowFunctionExpression: node => {
      node.expression = node.body.type !== 'BlockStatement';
    },
    ExistsTypeAnnotation: node => {
      node.type = 'ExistentialTypeParam';
    },
    NumberLiteralTypeAnnotation: node => {
      node.type = 'NumericLiteralTypeAnnotation';
    },
    ObjectTypeIndexer: node => {
      node.end++;
      node.loc.end.column++;
    },
    ForOfStatement: node => {
      node.type = 'ForAwaitStatement';
      delete node.await;
    },
    SpreadElement: (node, path) => {
      if (path.parentPath.isObjectExpression() || path.parentPath.isArrayExpression()) {
        node.type = 'SpreadProperty';
      }
    },
    RestElement: (node, path) => {
      if (path.parentPath.isObjectPattern() || path.parentPath.isArrayPattern()) {
        node.type = 'RestProperty';
      }
    }
  };
  (0, _traverse().default)(ast, {
    enter(path) {
      if (path.node.variance && path.node.variance.type === 'Variance') {
        path.node.variance = path.node.variance.kind;
      }

      let visitorFunc = visitor[path.node.type];

      if (visitorFunc) {
        visitorFunc(path.node, path);
      }
    }

  });
  return ast;
}

function babel6toBabel7(ast) {
  const visitor = {
    ArrowFunctionExpression: node => {
      delete node.expression;
    },
    ExistentialTypeParam: node => {
      node.type = 'ExistsTypeAnnotation';
    },
    NumericLiteralTypeAnnotation: node => {
      node.type = 'NumberLiteralTypeAnnotation';
    },
    ObjectTypeIndexer: node => {
      node.end--;
      node.loc.end.column--;
    },
    ForAwaitStatement: node => {
      node.type = 'ForOfStatement';
      node.await = true;
    },
    SpreadProperty: node => {
      node.type = 'SpreadElement';
    },
    RestProperty: node => {
      node.type = 'RestElement';
    }
  };
  (0, _traverse().default)(ast, {
    enter(path) {
      if (path.node.variance && typeof path.node.variance === 'string') {
        path.node.variance = {
          type: 'VarianceNode',
          kind: path.node.variance
        };
      }

      let visitorFunc = visitor[path.node.type];

      if (visitorFunc) {
        visitorFunc(path.node);
      }
    }

  });
  return ast;
}