"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _default = (rule, prop) => {
  return rule.filter(n => n.prop && n.prop.toLowerCase() === prop).pop();
};

exports.default = _default;
module.exports = exports.default;