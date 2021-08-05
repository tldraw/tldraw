"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _plugin = _interopRequireDefault(require("../plugin"));

var _browsers = require("../dictionary/browsers");

var _postcss = require("../dictionary/postcss");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _default = (0, _plugin.default)([_browsers.IE_5_5, _browsers.IE_6, _browsers.IE_7], [_postcss.DECL], function (decl) {
  const match = decl.value.match(/!\w/);

  if (match) {
    const hack = decl.value.substr(match.index, decl.value.length - 1);
    this.push(decl, {
      identifier: '!important',
      hack
    });
  }
});

exports.default = _default;
module.exports = exports.default;