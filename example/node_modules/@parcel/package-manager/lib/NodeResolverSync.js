"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NodeResolverSync = void 0;

function _path() {
  const data = _interopRequireDefault(require("path"));

  _path = function () {
    return data;
  };

  return data;
}

var _NodeResolverBase = require("./NodeResolverBase");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class NodeResolverSync extends _NodeResolverBase.NodeResolverBase {
  resolve(id, from) {
    let ctx = {
      invalidateOnFileCreate: [],
      invalidateOnFileChange: new Set()
    };

    if (id[0] === '.') {
      id = _path().default.resolve(_path().default.dirname(from), id);
    }

    let res = _path().default.isAbsolute(id) ? this.loadRelative(id, ctx) : this.loadNodeModules(id, from, ctx);

    if (!res) {
      let e = new Error(`Could not resolve module "${id}" from "${from}"`); // $FlowFixMe

      e.code = 'MODULE_NOT_FOUND';
      throw e;
    }

    if (_path().default.isAbsolute(res.resolved)) {
      res.resolved = this.fs.realpathSync(res.resolved);
    }

    return res;
  }

  loadRelative(id, ctx) {
    // First try as a file, then as a directory.
    return this.loadAsFile(id, null, ctx) || this.loadDirectory(id, null, ctx);
  }

  findPackage(sourceFile, ctx) {
    // If in node_modules, take a shortcut to find the package.json in the root of the package.
    let pkgPath = this.getNodeModulesPackagePath(sourceFile);

    if (pkgPath) {
      return this.readPackage(pkgPath, ctx);
    } // Find the nearest package.json file within the current node_modules folder


    let dir = _path().default.dirname(sourceFile);

    let pkgFile = this.fs.findAncestorFile(['package.json'], dir, this.projectRoot);

    if (pkgFile != null) {
      return this.readPackage(pkgFile, ctx);
    }
  }

  readPackage(file, ctx) {
    let cached = this.packageCache.get(file);

    if (cached) {
      ctx.invalidateOnFileChange.add(file);
      return cached;
    }

    let json;

    try {
      json = this.fs.readFileSync(file, 'utf8');
    } catch (err) {
      ctx.invalidateOnFileCreate.push({
        filePath: file
      });
      throw err;
    } // Add the invalidation *before* we try to parse the JSON in case of errors
    // so that changes are picked up if the file is edited to fix the error.


    ctx.invalidateOnFileChange.add(file);
    let pkg = JSON.parse(json);
    this.packageCache.set(file, pkg);
    return pkg;
  }

  loadAsFile(file, pkg, ctx) {
    // Try all supported extensions
    let files = this.expandFile(file);
    let found = this.fs.findFirstFile(files); // Add invalidations for higher priority files so we
    // re-resolve if any of them are created.

    for (let file of files) {
      if (file === found) {
        break;
      }

      ctx.invalidateOnFileCreate.push({
        filePath: file
      });
    }

    if (found) {
      return {
        resolved: this.fs.realpathSync(found),
        // Find a package.json file in the current package.
        pkg: pkg !== null && pkg !== void 0 ? pkg : this.findPackage(file, ctx),
        invalidateOnFileCreate: ctx.invalidateOnFileCreate,
        invalidateOnFileChange: ctx.invalidateOnFileChange
      };
    }

    return null;
  }

  loadDirectory(dir, pkg = null, ctx) {
    try {
      pkg = this.readPackage(_path().default.join(dir, 'package.json'), ctx); // Get a list of possible package entry points.

      let entries = this.getPackageEntries(dir, pkg);

      for (let file of entries) {
        // First try loading package.main as a file, then try as a directory.
        const res = this.loadAsFile(file, pkg, ctx) || this.loadDirectory(file, pkg, ctx);

        if (res) {
          return res;
        }
      }
    } catch (err) {// ignore
    } // Fall back to an index file inside the directory.


    return this.loadAsFile(_path().default.join(dir, 'index'), pkg, ctx);
  }

  loadNodeModules(id, from, ctx) {
    try {
      let module = this.findNodeModulePath(id, from, ctx);

      if (!module || module.resolved) {
        return module;
      } // If a module was specified as a module sub-path (e.g. some-module/some/path),
      // it is likely a file. Try loading it as a file first.


      if (module.subPath) {
        let pkg = this.readPackage(_path().default.join(module.moduleDir, 'package.json'), ctx);
        let res = this.loadAsFile(module.filePath, pkg, ctx);

        if (res) {
          return res;
        }
      } // Otherwise, load as a directory.


      if (module.filePath) {
        return this.loadDirectory(module.filePath, null, ctx);
      }
    } catch (e) {// ignore
    }
  }

}

exports.NodeResolverSync = NodeResolverSync;