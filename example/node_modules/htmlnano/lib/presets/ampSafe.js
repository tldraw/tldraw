"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _safe = _interopRequireDefault(require("./safe"));

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {
    default: obj
  };
}
/**
 * A safe preset for AMP pages (https://www.ampproject.org)
 */


var _default = { ..._safe.default,
  collapseBooleanAttributes: {
    amphtml: true
  },
  minifyJs: false
};
exports.default = _default;