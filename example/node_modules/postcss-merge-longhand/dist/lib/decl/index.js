"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _borders = _interopRequireDefault(require("./borders"));

var _columns = _interopRequireDefault(require("./columns"));

var _margin = _interopRequireDefault(require("./margin"));

var _padding = _interopRequireDefault(require("./padding"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _default = [_borders.default, _columns.default, _margin.default, _padding.default];
exports.default = _default;
module.exports = exports.default;