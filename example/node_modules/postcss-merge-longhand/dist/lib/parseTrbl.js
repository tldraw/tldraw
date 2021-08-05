"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _postcss = require("postcss");

var _default = v => {
  const s = typeof v === 'string' ? _postcss.list.space(v) : v;
  return [s[0], // top
  s[1] || s[0], // right
  s[2] || s[0], // bottom
  s[3] || s[1] || s[0] // left
  ];
};

exports.default = _default;
module.exports = exports.default;