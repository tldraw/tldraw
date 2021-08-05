"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = urlJoin;

function _url() {
  const data = _interopRequireDefault(require("url"));

  _url = function () {
    return data;
  };

  return data;
}

function _path() {
  const data = _interopRequireDefault(require("path"));

  _path = function () {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Joins a path onto a URL, and normalizes Windows paths
 * e.g. from \path\to\res.js to /path/to/res.js.
 */
function urlJoin(publicURL, assetPath) {
  const url = _url().default.parse(publicURL, false, true); // Leading / ensures that paths with colons are not parsed as a protocol.


  let p = assetPath.startsWith('/') ? assetPath : '/' + assetPath;

  const assetUrl = _url().default.parse(p);

  url.pathname = _path().default.posix.join(url.pathname, assetUrl.pathname);
  url.search = assetUrl.search;
  url.hash = assetUrl.hash;
  return _url().default.format(url);
}