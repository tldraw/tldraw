"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.matchSourceMappingURL = matchSourceMappingURL;
exports.loadSourceMapUrl = loadSourceMapUrl;
exports.loadSourceMap = loadSourceMap;
exports.remapSourceLocation = remapSourceLocation;
exports.SOURCEMAP_EXTENSIONS = exports.SOURCEMAP_RE = void 0;

function _sourceMap() {
  const data = _interopRequireDefault(require("@parcel/source-map"));

  _sourceMap = function () {
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

var _path2 = require("./path");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const SOURCEMAP_RE = /(?:\/\*|\/\/)\s*[@#]\s*sourceMappingURL\s*=\s*([^\s*]+)(?:\s*\*\/)?\s*$/;
exports.SOURCEMAP_RE = SOURCEMAP_RE;
const DATA_URL_RE = /^data:[^;]+(?:;charset=[^;]+)?;base64,(.*)/;
const SOURCEMAP_EXTENSIONS = new Set(['css', 'es', 'es6', 'js', 'jsx', 'mjs', 'ts', 'tsx']);
exports.SOURCEMAP_EXTENSIONS = SOURCEMAP_EXTENSIONS;

function matchSourceMappingURL(contents) {
  return contents.match(SOURCEMAP_RE);
}

async function loadSourceMapUrl(fs, filename, contents) {
  let match = matchSourceMappingURL(contents);

  if (match) {
    let url = match[1].trim();
    let dataURLMatch = url.match(DATA_URL_RE);
    let mapFilePath;

    if (dataURLMatch) {
      mapFilePath = filename;
    } else {
      mapFilePath = url.replace(/^file:\/\//, '');
      mapFilePath = (0, _path2.isAbsolute)(mapFilePath) ? mapFilePath : _path().default.join(_path().default.dirname(filename), mapFilePath);
    }

    return {
      url,
      filename: mapFilePath,
      map: JSON.parse(dataURLMatch ? Buffer.from(dataURLMatch[1], 'base64').toString() : await fs.readFile(mapFilePath, 'utf8'))
    };
  }
}

async function loadSourceMap(filename, contents, options) {
  let foundMap = await loadSourceMapUrl(options.fs, filename, contents);

  if (foundMap) {
    let mapSourceRoot = _path().default.dirname(filename);

    if (foundMap.map.sourceRoot && !(0, _path2.normalizeSeparators)(foundMap.map.sourceRoot).startsWith('/')) {
      mapSourceRoot = _path().default.join(mapSourceRoot, foundMap.map.sourceRoot);
    }

    let sourcemapInstance = new (_sourceMap().default)(options.projectRoot);
    sourcemapInstance.addVLQMap({ ...foundMap.map,
      sources: foundMap.map.sources.map(s => {
        return _path().default.join(mapSourceRoot, s);
      })
    });
    return sourcemapInstance;
  }
}

function remapSourceLocation(loc, originalMap) {
  let {
    filePath,
    start: {
      line: startLine,
      column: startCol
    },
    end: {
      line: endLine,
      column: endCol
    }
  } = loc;
  let lineDiff = endLine - startLine;
  let colDiff = endCol - startCol;
  let start = originalMap.findClosestMapping(startLine, startCol);
  let end = originalMap.findClosestMapping(endLine, endCol);

  if (start !== null && start !== void 0 && start.original) {
    if (start.source) {
      filePath = start.source;
    }

    ({
      line: startLine,
      column: startCol
    } = start.original);
    startCol++; // source map columns are 0-based
  }

  if (end !== null && end !== void 0 && end.original) {
    ({
      line: endLine,
      column: endCol
    } = end.original);
    endCol++;

    if (endLine < startLine) {
      endLine = startLine;
      endCol = startCol;
    } else if (endLine === startLine && endCol < startCol && lineDiff === 0) {
      endCol = startCol + colDiff;
    }
  } else {
    endLine = startLine;
    endCol = startCol;
  }

  return {
    filePath,
    start: {
      line: startLine,
      column: startCol
    },
    end: {
      line: endLine,
      column: endCol
    }
  };
}