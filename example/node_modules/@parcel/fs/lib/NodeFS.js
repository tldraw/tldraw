"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NodeFS = void 0;

function _gracefulFs() {
  const data = _interopRequireDefault(require("graceful-fs"));

  _gracefulFs = function () {
    return data;
  };

  return data;
}

function _ncp() {
  const data = _interopRequireDefault(require("ncp"));

  _ncp = function () {
    return data;
  };

  return data;
}

function _mkdirp() {
  const data = _interopRequireDefault(require("mkdirp"));

  _mkdirp = function () {
    return data;
  };

  return data;
}

function _rimraf() {
  const data = _interopRequireDefault(require("rimraf"));

  _rimraf = function () {
    return data;
  };

  return data;
}

function _util() {
  const data = require("util");

  _util = function () {
    return data;
  };

  return data;
}

function _core() {
  const data = require("@parcel/core");

  _core = function () {
    return data;
  };

  return data;
}

function _fsWriteStreamAtomic() {
  const data = _interopRequireDefault(require("@parcel/fs-write-stream-atomic"));

  _fsWriteStreamAtomic = function () {
    return data;
  };

  return data;
}

function _watcher() {
  const data = _interopRequireDefault(require("@parcel/watcher"));

  _watcher = function () {
    return data;
  };

  return data;
}

var _package = _interopRequireDefault(require("../package.json"));

function searchNative() {
  const data = _interopRequireWildcard(require("@parcel/fs-search"));

  searchNative = function () {
    return data;
  };

  return data;
}

var searchJS = _interopRequireWildcard(require("./find"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Most of this can go away once we only support Node 10+, which includes
// require('fs').promises
const realpath = (0, _util().promisify)(process.platform === 'win32' ? _gracefulFs().default.realpath : _gracefulFs().default.realpath.native);
const isPnP = process.versions.pnp != null;

class NodeFS {
  readFile = (0, _util().promisify)(_gracefulFs().default.readFile);
  copyFile = (0, _util().promisify)(_gracefulFs().default.copyFile);
  stat = (0, _util().promisify)(_gracefulFs().default.stat);
  readdir = (0, _util().promisify)(_gracefulFs().default.readdir);
  unlink = (0, _util().promisify)(_gracefulFs().default.unlink);
  utimes = (0, _util().promisify)(_gracefulFs().default.utimes);
  mkdirp = (0, _util().promisify)(_mkdirp().default);
  rimraf = (0, _util().promisify)(_rimraf().default);
  ncp = (0, _util().promisify)(_ncp().default);
  createReadStream = _gracefulFs().default.createReadStream;
  cwd = () => process.cwd();
  chdir = directory => process.chdir(directory);
  statSync = path => _gracefulFs().default.statSync(path);
  realpathSync = process.platform === 'win32' ? _gracefulFs().default.realpathSync : _gracefulFs().default.realpathSync.native;
  existsSync = _gracefulFs().default.existsSync;
  readdirSync = _gracefulFs().default.readdirSync;
  findAncestorFile = isPnP ? (...args) => searchJS.findAncestorFile(this, ...args) : searchNative().findAncestorFile;
  findNodeModule = isPnP ? (...args) => searchJS.findNodeModule(this, ...args) : searchNative().findNodeModule;
  findFirstFile = isPnP ? (...args) => searchJS.findFirstFile(this, ...args) : searchNative().findFirstFile;

  createWriteStream(filePath, options) {
    return (0, _fsWriteStreamAtomic().default)(filePath, options);
  }

  async writeFile(filePath, contents, options) {
    let tmpFilePath = getTempFilePath(filePath);
    await _gracefulFs().default.promises.writeFile(tmpFilePath, contents, // $FlowFixMe
    options);
    await _gracefulFs().default.promises.rename(tmpFilePath, filePath);
  }

  readFileSync(filePath, encoding) {
    if (encoding != null) {
      return _gracefulFs().default.readFileSync(filePath, encoding);
    }

    return _gracefulFs().default.readFileSync(filePath);
  }

  async realpath(originalPath) {
    try {
      return await realpath(originalPath, 'utf8');
    } catch (e) {// do nothing
    }

    return originalPath;
  }

  exists(filePath) {
    return new Promise(resolve => {
      _gracefulFs().default.exists(filePath, resolve);
    });
  }

  watch(dir, fn, opts) {
    return _watcher().default.subscribe(dir, fn, opts);
  }

  getEventsSince(dir, snapshot, opts) {
    return _watcher().default.getEventsSince(dir, snapshot, opts);
  }

  async writeSnapshot(dir, snapshot, opts) {
    await _watcher().default.writeSnapshot(dir, snapshot, opts);
  }

  static deserialize() {
    return new NodeFS();
  }

  serialize() {
    return null;
  }

}

exports.NodeFS = NodeFS;
(0, _core().registerSerializableClass)(`${_package.default.version}:NodeFS`, NodeFS);
let writeStreamCalls = 0;
let threadId;

try {
  ({
    threadId
  } = require('worker_threads'));
} catch {//
} // Generate a temporary file path used for atomic writing of files.


function getTempFilePath(filePath) {
  writeStreamCalls = writeStreamCalls % Number.MAX_SAFE_INTEGER;
  return filePath + '.' + process.pid + (threadId != null ? '.' + threadId : '') + '.' + (writeStreamCalls++).toString(36);
}