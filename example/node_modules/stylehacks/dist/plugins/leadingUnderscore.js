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

function vendorPrefix(prop) {
  let match = prop.match(/^(-\w+-)/);

  if (match) {
    return match[0];
  }

  return '';
}

var _default = (0, _plugin.default)([_browsers.IE_6], [_postcss.DECL], function (decl) {
  const {
    before
  } = decl.raws;

  if (before && ~before.indexOf('_')) {
    this.push(decl, {
      identifier: _identifiers.PROPERTY,
      hack: `${before.trim()}${decl.prop}`
    });
  }

  if (decl.prop[0] === '-' && decl.prop[1] !== '-' && vendorPrefix(decl.prop) === '') {
    this.push(decl, {
      identifier: _identifiers.PROPERTY,
      hack: decl.prop
    });
  }
});

exports.default = _default;
module.exports = exports.default;