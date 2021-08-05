"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _plugin = _interopRequireDefault(require("../plugin"));

var _isMixin = _interopRequireDefault(require("../isMixin"));

var _browsers = require("../dictionary/browsers");

var _identifiers = require("../dictionary/identifiers");

var _postcss = require("../dictionary/postcss");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _default = (0, _plugin.default)([_browsers.IE_5_5, _browsers.IE_6, _browsers.IE_7], [_postcss.RULE], function (rule) {
  if ((0, _isMixin.default)(rule)) {
    return;
  }

  const {
    selector
  } = rule;
  const trim = selector.trim();

  if (trim.lastIndexOf(',') === selector.length - 1 || trim.lastIndexOf('\\') === selector.length - 1) {
    this.push(rule, {
      identifier: _identifiers.SELECTOR,
      hack: selector
    });
  }
});

exports.default = _default;
module.exports = exports.default;