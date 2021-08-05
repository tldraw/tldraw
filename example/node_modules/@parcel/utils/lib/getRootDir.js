"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getRootDir;

var _glob = require("./glob");

function _path() {
  const data = _interopRequireDefault(require("path"));

  _path = function () {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getRootDir(files) {
  let cur = null;

  for (let file of files) {
    let parsed = _path().default.parse(file);

    parsed.dir = findGlobRoot(parsed.dir);

    if (!cur) {
      cur = parsed;
    } else if (parsed.root !== cur.root) {
      // bail out. there is no common root.
      // this can happen on windows, e.g. C:\foo\bar vs. D:\foo\bar
      return process.cwd();
    } else {
      // find the common path parts.
      let curParts = cur.dir.split(_path().default.sep);
      let newParts = parsed.dir.split(_path().default.sep);
      let len = Math.min(curParts.length, newParts.length);
      let i = 0;

      while (i < len && curParts[i] === newParts[i]) {
        i++;
      }

      cur.dir = i > 1 ? curParts.slice(0, i).join(_path().default.sep) : cur.root;
    }
  }

  return cur ? cur.dir : process.cwd();
} // Transforms a path like `packages/*/src/index.js` to the root of the glob, `packages/`


function findGlobRoot(dir) {
  let parts = dir.split(_path().default.sep);
  let last = parts.length;

  for (let i = parts.length - 1; i >= 0; i--) {
    if ((0, _glob.isGlob)(parts[i])) {
      last = i;
    }
  }

  return parts.slice(0, last).join(_path().default.sep);
}