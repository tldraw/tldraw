"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = isURL;

function _isUrl() {
  const data = _interopRequireDefault(require("is-url"));

  _isUrl = function () {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Matches anchor (ie: #raptors)
const ANCHOR_REGEXP = /^#/; // Matches scheme (ie: tel:, mailto:, data:, itms-apps:)

const SCHEME_REGEXP = /^[a-z][a-z0-9\-+.]*:/i;

function isURL(url) {
  return (0, _isUrl().default)(url) || ANCHOR_REGEXP.test(url) || SCHEME_REGEXP.test(url);
}