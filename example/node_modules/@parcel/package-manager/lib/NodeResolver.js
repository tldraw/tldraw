"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NodeResolver = void 0;

function _path() {
  const data = _interopRequireDefault(require("path"));

  _path = function () {
    return data;
  };

  return data;
}

var _NodeResolverBase = require("./NodeResolverBase");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class NodeResolver extends _NodeResolverBase.NodeResolverBase {
  async resolve(id, from) {
    let ctx = {
      invalidateOnFileCreate: [],
      invalidateOnFileChange: new Set()
    };

    if (id[0] === '.') {
      id = _path().default.resolve(_path().default.dirname(from), id);
    }

    let res = _path().default.isAbsolute(id) ? await this.loadRelative(id, ctx) : await this.loadNodeModules(id, from, ctx);

    if (!res) {
      let e = new Error(`Could not resolve module "${id}" from "${from}"`); // $FlowFixMe[prop-missing]

      e.code = 'MODULE_NOT_FOUND';
      throw e;
    }

    if (_path().default.isAbsolute(res.resolved)) {
      res.resolved = await this.fs.realpath(res.resolved);
    }

    return res;
  }

  async loadRelative(id, ctx) {
    // First try as a file, then as a directory.
    return (await this.loadAsFile(id, null, ctx)) || (await this.loadDirectory(id, null, ctx)) // eslint-disable-line no-return-await
    ;
  }

  findPackage(sourceFile, ctx) {
    // If in node_modules, take a shortcut to find the package.json in the root of the package.
    let pkgPath = this.getNodeModulesPackagePath(sourceFile);

    if (pkgPath) {
      return this.readPackage(pkgPath, ctx);
    }

    ctx.invalidateOnFileCreate.push({
      fileName: 'package.json',
      aboveFilePath: sourceFile
    });

    let dir = _path().default.dirname(sourceFile);

    let pkgFile = this.fs.findAncestorFile(['package.json'], dir, this.projectRoot);

    if (pkgFile != null) {
      return this.readPackage(pkgFile, ctx);
    }

    return Promise.resolve(null);
  }

  async readPackage(file, ctx) {
    let cached = this.packageCache.get(file);

    if (cached) {
      ctx.invalidateOnFileChange.add(file);
      return cached;
    }

    let json;

    try {
      json = await this.fs.readFile(file, 'utf8');
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

  async loadAsFile(file, pkg, ctx) {
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
        resolved: await this.fs.realpath(found),
        // Find a package.json file in the current package.
        pkg: pkg !== null && pkg !== void 0 ? pkg : await this.findPackage(file, ctx),
        invalidateOnFileCreate: ctx.invalidateOnFileCreate,
        invalidateOnFileChange: ctx.invalidateOnFileChange
      };
    }

    return null;
  }

  async loadDirectory(dir, pkg = null, ctx) {
    try {
      pkg = await this.readPackage(_path().default.join(dir, 'package.json'), ctx); // Get a list of possible package entry points.

      let entries = this.getPackageEntries(dir, pkg);

      for (let file of entries) {
        // First try loading package.main as a file, then try as a directory.
        const res = (await this.loadAsFile(file, pkg, ctx)) || (await this.loadDirectory(file, pkg, ctx));

        if (res) {
          return res;
        }
      }
    } catch (err) {// ignore
    } // Fall back to an index file inside the directory.


    return this.loadAsFile(_path().default.join(dir, 'index'), pkg, ctx);
  }

  async loadNodeModules(id, from, ctx) {
    try {
      let module = this.findNodeModulePath(id, from, ctx);

      if (!module || module.resolved) {
        return module;
      } // If a module was specified as a module sub-path (e.g. some-module/some/path),
      // it is likely a file. Try loading it as a file first.


      if (module.subPath) {
        let pkg = await this.readPackage(_path().default.join(module.moduleDir, 'package.json'), ctx);
        let res = await this.loadAsFile(module.filePath, pkg, ctx);

        if (res) {
          return res;
        }
      } // Otherwise, load as a directory.


      if (module.filePath) {
        return await this.loadDirectory(module.filePath, null, ctx);
      }
    } catch (e) {// ignore
    }
  }

}

exports.NodeResolver = NodeResolver;