"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.findNodeModule = findNodeModule;
exports.findAncestorFile = findAncestorFile;
exports.findFirstFile = findFirstFile;

function _path() {
  const data = _interopRequireDefault(require("path"));

  _path = function () {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function findNodeModule(fs, moduleName, dir) {
  let {
    root
  } = _path().default.parse(dir);

  while (dir !== root) {
    // Skip node_modules directories
    if (_path().default.basename(dir) === 'node_modules') {
      dir = _path().default.dirname(dir);
    }

    try {
      let moduleDir = _path().default.join(dir, 'node_modules', moduleName);

      let stats = fs.statSync(moduleDir);

      if (stats.isDirectory()) {
        return moduleDir;
      }
    } catch (err) {// ignore
    } // Move up a directory


    dir = _path().default.dirname(dir);
  }

  return null;
}

function findAncestorFile(fs, fileNames, dir, root) {
  let {
    root: pathRoot
  } = _path().default.parse(dir); // eslint-disable-next-line no-constant-condition


  while (true) {
    if (_path().default.basename(dir) === 'node_modules') {
      return null;
    }

    for (const fileName of fileNames) {
      let filePath = _path().default.join(dir, fileName);

      try {
        if (fs.statSync(filePath).isFile()) {
          return filePath;
        }
      } catch (err) {// ignore
      }
    }

    if (dir === root || dir === pathRoot) {
      break;
    }

    dir = _path().default.dirname(dir);
  }

  return null;
}

function findFirstFile(fs, filePaths) {
  for (let filePath of filePaths) {
    try {
      if (fs.statSync(filePath).isFile()) {
        return filePath;
      }
    } catch (err) {// ignore
    }
  }
}