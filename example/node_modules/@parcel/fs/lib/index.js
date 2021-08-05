"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  ncp: true
};
exports.ncp = ncp;

function _path() {
  const data = _interopRequireDefault(require("path"));

  _path = function () {
    return data;
  };

  return data;
}

var _NodeFS = require("./NodeFS");

Object.keys(_NodeFS).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _NodeFS[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _NodeFS[key];
    }
  });
});

var _MemoryFS = require("./MemoryFS");

Object.keys(_MemoryFS).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _MemoryFS[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _MemoryFS[key];
    }
  });
});

var _OverlayFS = require("./OverlayFS");

Object.keys(_OverlayFS).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _OverlayFS[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _OverlayFS[key];
    }
  });
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Recursively copies a directory from the sourceFS to the destinationFS
async function ncp(sourceFS, source, destinationFS, destination) {
  await destinationFS.mkdirp(destination);
  let files = await sourceFS.readdir(source);

  for (let file of files) {
    let sourcePath = _path().default.join(source, file);

    let destPath = _path().default.join(destination, file);

    let stats = await sourceFS.stat(sourcePath);

    if (stats.isFile()) {
      await new Promise((resolve, reject) => {
        sourceFS.createReadStream(sourcePath).pipe(destinationFS.createWriteStream(destPath)).on('finish', () => resolve()).on('error', reject);
      });
    } else if (stats.isDirectory()) {
      await ncp(sourceFS, sourcePath, destinationFS, destPath);
    }
  }
}