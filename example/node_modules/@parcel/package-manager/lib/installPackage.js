"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._addToInstallQueue = _addToInstallQueue;
exports.installPackage = installPackage;

function _assert() {
  const data = _interopRequireDefault(require("assert"));

  _assert = function () {
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

function _nullthrows() {
  const data = _interopRequireDefault(require("nullthrows"));

  _nullthrows = function () {
    return data;
  };

  return data;
}

function _semver() {
  const data = _interopRequireDefault(require("semver"));

  _semver = function () {
    return data;
  };

  return data;
}

function _diagnostic() {
  const data = _interopRequireWildcard(require("@parcel/diagnostic"));

  _diagnostic = function () {
    return data;
  };

  return data;
}

function _logger() {
  const data = _interopRequireDefault(require("@parcel/logger"));

  _logger = function () {
    return data;
  };

  return data;
}

function _utils() {
  const data = require("@parcel/utils");

  _utils = function () {
    return data;
  };

  return data;
}

function _workers() {
  const data = _interopRequireDefault(require("@parcel/workers"));

  _workers = function () {
    return data;
  };

  return data;
}

var _Npm = require("./Npm");

var _Yarn = require("./Yarn");

var _Pnpm = require("./Pnpm.js");

var _utils2 = require("./utils");

var _validateModuleSpecifier = _interopRequireDefault(require("./validateModuleSpecifier"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

async function install(fs, packageManager, modules, from, projectRoot, options = {}) {
  let {
    installPeers = true,
    saveDev = true,
    packageInstaller
  } = options;
  let moduleNames = modules.map(m => m.name).join(', ');

  _logger().default.progress(`Installing ${moduleNames}...`);

  let fromPkgPath = await (0, _utils().resolveConfig)(fs, from, ['package.json'], projectRoot);
  let cwd = fromPkgPath ? _path().default.dirname(fromPkgPath) : fs.cwd();

  if (!packageInstaller) {
    packageInstaller = await determinePackageInstaller(fs, from, projectRoot);
  }

  try {
    await packageInstaller.install({
      modules,
      saveDev,
      cwd,
      packagePath: fromPkgPath,
      fs
    });
  } catch (err) {
    throw new Error(`Failed to install ${moduleNames}: ${err.message}`);
  }

  if (installPeers) {
    await Promise.all(modules.map(m => installPeerDependencies(fs, packageManager, m, from, projectRoot, options)));
  }
}

async function installPeerDependencies(fs, packageManager, module, from, projectRoot, options) {
  const {
    resolved
  } = await packageManager.resolve(module.name, from);
  const modulePkg = (0, _nullthrows().default)(await (0, _utils().loadConfig)(fs, resolved, ['package.json'], projectRoot)).config;
  const peers = modulePkg.peerDependencies || {};
  let modules = [];

  for (let [name, range] of Object.entries(peers)) {
    (0, _assert().default)(typeof range === 'string');
    let conflicts = await (0, _utils2.getConflictingLocalDependencies)(fs, name, from, projectRoot);

    if (conflicts) {
      let {
        pkg
      } = await packageManager.resolve(name, from);
      (0, _assert().default)(pkg);

      if (!_semver().default.satisfies(pkg.version, range)) {
        throw new (_diagnostic().default)({
          diagnostic: {
            message: (0, _diagnostic().md)`Could not install the peer dependency "${name}" for "${module.name}", installed version ${pkg.version} is incompatible with ${range}`,
            origin: '@parcel/package-manager',
            codeFrames: [{
              filePath: conflicts.filePath,
              language: 'json',
              code: conflicts.json,
              codeHighlights: (0, _diagnostic().generateJSONCodeHighlights)(conflicts.json, conflicts.fields.map(field => ({
                key: `/${field}/${(0, _diagnostic().encodeJSONKeyComponent)(name)}`,
                type: 'key',
                message: 'Found this conflicting local requirement.'
              })))
            }]
          }
        });
      }

      continue;
    }

    modules.push({
      name,
      range
    });
  }

  if (modules.length) {
    await install(fs, packageManager, modules, from, projectRoot, Object.assign({}, options, {
      installPeers: false
    }));
  }
}

async function determinePackageInstaller(fs, filepath, projectRoot) {
  let configFile = await (0, _utils().resolveConfig)(fs, filepath, ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'], projectRoot);

  let configName = configFile && _path().default.basename(configFile); // Always use the package manager that seems to be used in the project,
  // falling back to a different one wouldn't update the existing lockfile.


  if (configName === 'package-lock.json') {
    return new _Npm.Npm();
  } else if (configName === 'pnpm-lock.yaml') {
    return new _Pnpm.Pnpm();
  } else if (configName === 'yarn.lock') {
    return new _Yarn.Yarn();
  }

  if (await _Yarn.Yarn.exists()) {
    return new _Yarn.Yarn();
  } else if (await _Pnpm.Pnpm.exists()) {
    return new _Pnpm.Pnpm();
  } else {
    return new _Npm.Npm();
  }
}

let queue = new (_utils().PromiseQueue)({
  maxConcurrent: 1
});
let modulesInstalling = new Set(); // Exported so that it may be invoked from the worker api below.
// Do not call this directly! This can result in concurrent package installations
// across multiple instances of the package manager.

function _addToInstallQueue(fs, packageManager, modules, filePath, projectRoot, options) {
  modules = modules.map(request => ({
    name: (0, _validateModuleSpecifier.default)(request.name),
    range: request.range
  })); // Wrap PromiseQueue and track modules that are currently installing.
  // If a request comes in for a module that is currently installing, don't bother
  // enqueuing it.

  let modulesToInstall = modules.filter(m => !modulesInstalling.has(getModuleRequestKey(m)));

  if (modulesToInstall.length) {
    for (let m of modulesToInstall) {
      modulesInstalling.add(getModuleRequestKey(m));
    }

    queue.add(() => install(fs, packageManager, modulesToInstall, filePath, projectRoot, options).then(() => {
      for (let m of modulesToInstall) {
        modulesInstalling.delete(getModuleRequestKey(m));
      }
    })).then(() => {}, () => {});
  }

  return queue.run();
}

function installPackage(fs, packageManager, modules, filePath, projectRoot, options) {
  if (_workers().default.isWorker()) {
    let workerApi = _workers().default.getWorkerApi();

    return workerApi.callMaster({
      location: __filename,
      args: [fs, packageManager, modules, filePath, projectRoot, options],
      method: '_addToInstallQueue'
    });
  }

  return _addToInstallQueue(fs, packageManager, modules, filePath, projectRoot, options);
}

function getModuleRequestKey(moduleRequest) {
  return [moduleRequest.name, moduleRequest.range].join('@');
}