"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _plugin = _interopRequireDefault(require("../plugin"));

var _browsers = require("../dictionary/browsers");

var _identifiers = require("../dictionary/identifiers");

var _postcss = require("../dictionary/postcss");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _default = (0, _plugin.default)([_browsers.IE_5_5, _browsers.IE_6, _browsers.IE_7], [_postcss.ATRULE], function (rule) {
  const params = rule.params.trim();

  if (params.toLowerCase() === 'screen\\9') {
    this.push(rule, {
      identifier: _identifiers.MEDIA_QUERY,
      hack: params
    });
  }
});

exports.default = _default;
module.exports = exports.default;