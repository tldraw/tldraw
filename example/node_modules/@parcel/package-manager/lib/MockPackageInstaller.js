"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MockPackageInstaller = void 0;

function _path() {
  const data = _interopRequireDefault(require("path"));

  _path = function () {
    return data;
  };

  return data;
}

function _fs() {
  const data = require("@parcel/fs");

  _fs = function () {
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

var _package = _interopRequireDefault(require("../package.json"));

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// This PackageInstaller implementation simply copies files from one filesystem to another.
// Mostly useful for testing purposes.
class MockPackageInstaller {
  packages = new Map();

  register(packageName, fs, packagePath) {
    this.packages.set(packageName, {
      fs,
      packagePath
    });
  }

  async install({
    modules,
    fs,
    cwd,
    packagePath,
    saveDev = true
  }) {
    if (packagePath == null) {
      packagePath = _path().default.join(cwd, 'package.json');
      await fs.writeFile(packagePath, '{}');
    }

    let pkg = JSON.parse(await fs.readFile(packagePath, 'utf8'));
    let key = saveDev ? 'devDependencies' : 'dependencies';

    if (!pkg[key]) {
      pkg[key] = {};
    }

    for (let module of modules) {
      pkg[key][module.name] = '^' + (await this.installPackage(module, fs, packagePath));
    }

    await fs.writeFile(packagePath, JSON.stringify(pkg));
  }

  async installPackage(moduleRequest, fs, packagePath) {
    let pkg = this.packages.get(moduleRequest.name);

    if (!pkg) {
      throw new Error('Unknown package ' + moduleRequest.name);
    }

    let dest = _path().default.join(_path().default.dirname(packagePath), 'node_modules', moduleRequest.name);

    await (0, _fs().ncp)(pkg.fs, pkg.packagePath, fs, dest);
    let packageJSON = JSON.parse(await fs.readFile(_path().default.join(dest, 'package.json'), 'utf8'));

    if (packageJSON.dependencies != null) {
      for (let dep of (0, _utils.moduleRequestsFromDependencyMap)(packageJSON.dependencies)) {
        await this.installPackage(dep, fs, packagePath);
      }
    }

    return packageJSON.version;
  }

}

exports.MockPackageInstaller = MockPackageInstaller;
(0, _core().registerSerializableClass)(`${_package.default.version}:MockPackageInstaller`, MockPackageInstaller);