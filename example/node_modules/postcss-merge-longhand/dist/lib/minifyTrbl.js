"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _parseTrbl = _interopRequireDefault(require("./parseTrbl"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _default = v => {
  const value = (0, _parseTrbl.default)(v);

  if (value[3] === value[1]) {
    value.pop();

    if (value[2] === value[0]) {
      value.pop();

      if (value[0] === value[1]) {
        value.pop();
      }
    }
  }

  return value.join(' ');
};

exports.default = _default;
module.exports = exports.default;