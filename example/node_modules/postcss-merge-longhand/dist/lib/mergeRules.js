"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = mergeRules;

var _hasAllProps = _interopRequireDefault(require("./hasAllProps"));

var _getDecls = _interopRequireDefault(require("./getDecls"));

var _getRules = _interopRequireDefault(require("./getRules"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function isConflictingProp(propA, propB) {
  if (!propB.prop || propB.important !== propA.important) {
    return;
  }

  const parts = propA.prop.split('-');
  return parts.some(() => {
    parts.pop();
    return parts.join('-') === propB.prop;
  });
}

function hasConflicts(match, nodes) {
  const firstNode = Math.min.apply(null, match.map(n => nodes.indexOf(n)));
  const lastNode = Math.max.apply(null, match.map(n => nodes.indexOf(n)));
  const between = nodes.slice(firstNode + 1, lastNode);
  return match.some(a => between.some(b => isConflictingProp(a, b)));
}

function mergeRules(rule, properties, callback) {
  let decls = (0, _getDecls.default)(rule, properties);

  while (decls.length) {
    const last = decls[decls.length - 1];
    const props = decls.filter(node => node.important === last.important);
    const rules = (0, _getRules.default)(props, properties);

    if ((0, _hasAllProps.default)(rules, ...properties) && !hasConflicts(rules, rule.nodes)) {
      if (callback(rules, last, props)) {
        decls = decls.filter(node => !~rules.indexOf(node));
      }
    }

    decls = decls.filter(node => node !== last);
  }
}

module.exports = exports.default;