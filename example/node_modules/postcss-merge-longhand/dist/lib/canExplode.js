"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _isCustomProp = _interopRequireDefault(require("./isCustomProp"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const hasGlobalKeyword = prop => prop && prop.value && ['inherit', 'initial', 'unset', 'revert'].includes(prop.value.toLowerCase());

var _default = (prop, includeCustomProps = true) => {
  if (!prop.value || includeCustomProps && (0, _isCustomProp.default)(prop) || hasGlobalKeyword(prop)) {
    return false;
  }

  return true;
};

exports.default = _default;
module.exports = exports.default;