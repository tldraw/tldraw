"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = parseCSSImport;

function parseCSSImport(url) {
  if (!/^(~|\.\/|\/)/.test(url)) {
    return './' + url;
  } else if (!/^(~\/|\.\/|\/)/.test(url)) {
    return url.substring(1);
  } else {
    return url;
  }
}