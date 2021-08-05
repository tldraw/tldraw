"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isGlob = isGlob;
exports.isGlobMatch = isGlobMatch;
exports.globSync = globSync;
exports.glob = glob;

function _isGlob2() {
  const data = _interopRequireDefault(require("is-glob"));

  _isGlob2 = function () {
    return data;
  };

  return data;
}

function _fastGlob() {
  const data = _interopRequireDefault(require("fast-glob"));

  _fastGlob = function () {
    return data;
  };

  return data;
}

function _micromatch() {
  const data = require("micromatch");

  _micromatch = function () {
    return data;
  };

  return data;
}

var _path = require("./path");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function isGlob(p) {
  return (0, _isGlob2().default)((0, _path.normalizeSeparators)(p));
}

function isGlobMatch(filePath, glob) {
  return (0, _micromatch().isMatch)(filePath, (0, _path.normalizeSeparators)(glob));
}

function globSync(p, fs, options) {
  // $FlowFixMe
  options = { ...options,
    fs: {
      statSync: p => {
        return fs.statSync(p);
      },
      lstatSync: p => {
        // Our FileSystem interface doesn't have lstat support at the moment,
        // but this is fine for our purposes since we follow symlinks by default.
        return fs.statSync(p);
      },
      readdirSync: (p, opts) => {
        return fs.readdirSync(p, opts);
      }
    }
  }; // $FlowFixMe

  return _fastGlob().default.sync((0, _path.normalizeSeparators)(p), options);
}

function glob(p, fs, options) {
  // $FlowFixMe
  options = { ...options,
    fs: {
      stat: async (p, cb) => {
        try {
          cb(null, await fs.stat(p));
        } catch (err) {
          cb(err);
        }
      },
      lstat: async (p, cb) => {
        // Our FileSystem interface doesn't have lstat support at the moment,
        // but this is fine for our purposes since we follow symlinks by default.
        try {
          cb(null, await fs.stat(p));
        } catch (err) {
          cb(err);
        }
      },
      readdir: async (p, opts, cb) => {
        if (typeof opts === 'function') {
          cb = opts;
          opts = null;
        }

        try {
          cb(null, await fs.readdir(p, opts));
        } catch (err) {
          cb(err);
        }
      }
    }
  }; // $FlowFixMe Added in Flow 0.121.0 upgrade in #4381

  return (0, _fastGlob().default)((0, _path.normalizeSeparators)(p), options);
}