"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getBaseURL = getBaseURL;
exports.getBundleURL = void 0;
let bundleURL = null;

function getBundleURLCached() {
  if (bundleURL == null) {
    bundleURL = _getBundleURL();
  }

  return bundleURL;
}

function _getBundleURL() {
  // Attempt to find the URL of the current script and use that as the base URL
  try {
    throw new Error();
  } catch (err) {
    let stack = typeof err.stack === 'string' ? err.stack : '';
    let matches = stack.match(/(https?|file|ftp):\/\/[^)\n]+/g);

    if (matches) {
      return getBaseURL(matches[0]);
    }
  }

  return '/';
}

function getBaseURL(url) {
  if (url == null) {
    return '/';
  }

  return url.replace(/^((?:https?|file|ftp):\/\/.+)\/[^/]+$/, '$1') + '/';
}

const getBundleURL = getBundleURLCached;
exports.getBundleURL = getBundleURL;