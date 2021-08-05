"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _postcss = require("postcss");

var _postcss2 = _interopRequireDefault(_postcss);

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _parser = require("./parser");

var _parser2 = _interopRequireDefault(_parser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Copied from https://github.com/css-modules/css-modules-loader-core

class Core {
  constructor(plugins) {
    this.plugins = plugins || Core.defaultPlugins;
  }

  load(sourceString, sourcePath, trace, pathFetcher) {
    let parser = new _parser2.default(pathFetcher, trace);

    return (0, _postcss2.default)(this.plugins.concat([parser.plugin])).process(sourceString, { from: "/" + sourcePath }).then(result => {
      return {
        injectableSource: result.css,
        exportTokens: parser.exportTokens
      };
    });
  }
}

// Sorts dependencies in the following way:
// AAA comes before AA and A
// AB comes after AA and before A
// All Bs come after all As
// This ensures that the files are always returned in the following order:
// - In the order they were required, except
// - After all their dependencies
const traceKeySorter = (a, b) => {
  if (a.length < b.length) {
    return a < b.substring(0, a.length) ? -1 : 1;
  } else if (a.length > b.length) {
    return a.substring(0, b.length) <= b ? -1 : 1;
  } else {
    return a < b ? -1 : 1;
  }
};

class FileSystemLoader {
  constructor(root, plugins) {
    this.root = root;
    this.sources = {};
    this.traces = {};
    this.importNr = 0;
    this.core = new Core(plugins);
    this.tokensByFile = {};
  }

  fetch(_newPath, relativeTo, _trace) {
    let newPath = _newPath.replace(/^["']|["']$/g, ""),
        trace = _trace || String.fromCharCode(this.importNr++);
    return new Promise((resolve, reject) => {
      let relativeDir = _path2.default.dirname(relativeTo),
          rootRelativePath = _path2.default.resolve(relativeDir, newPath),
          fileRelativePath = _path2.default.resolve(_path2.default.join(this.root, relativeDir), newPath);

      // if the path is not relative or absolute, try to resolve it in node_modules
      if (newPath[0] !== "." && newPath[0] !== "/") {
        try {
          fileRelativePath = require.resolve(newPath);
        } catch (e) {
          // noop
        }
      }

      const tokens = this.tokensByFile[fileRelativePath];
      if (tokens) {
        return resolve(tokens);
      }

      _fs2.default.readFile(fileRelativePath, "utf-8", (err, source) => {
        if (err) reject(err);
        this.core.load(source, rootRelativePath, trace, this.fetch.bind(this)).then(({ injectableSource, exportTokens }) => {
          this.sources[fileRelativePath] = injectableSource;
          this.traces[trace] = fileRelativePath;
          this.tokensByFile[fileRelativePath] = exportTokens;
          resolve(exportTokens);
        }, reject);
      });
    });
  }

  get finalSource() {
    const traces = this.traces;
    const sources = this.sources;
    let written = new Set();

    return Object.keys(traces).sort(traceKeySorter).map(key => {
      const filename = traces[key];
      if (written.has(filename)) {
        return null;
      }
      written.add(filename);

      return sources[filename];
    }).join("");
  }
}
exports.default = FileSystemLoader;