"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _parseWsc = _interopRequireDefault(require("./parseWsc"));

var _minifyTrbl = _interopRequireDefault(require("./minifyTrbl"));

var _validateWsc = require("./validateWsc");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const defaults = ['medium', 'none', 'currentcolor'];

var _default = v => {
  const values = (0, _parseWsc.default)(v);

  if (!(0, _validateWsc.isValidWsc)(values)) {
    return (0, _minifyTrbl.default)(v);
  }

  const value = [...values, ''].reduceRight((prev, cur, i, arr) => {
    if (cur === undefined || cur.toLowerCase() === defaults[i] && (!i || (arr[i - 1] || '').toLowerCase() !== cur.toLowerCase())) {
      return prev;
    }

    return cur + ' ' + prev;
  }).trim();
  return (0, _minifyTrbl.default)(value || 'none');
};

exports.default = _default;
module.exports = exports.default;