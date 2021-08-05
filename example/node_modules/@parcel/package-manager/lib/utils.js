"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.npmSpecifierFromModuleRequest = npmSpecifierFromModuleRequest;
exports.moduleRequestsFromDependencyMap = moduleRequestsFromDependencyMap;
exports.getConflictingLocalDependencies = getConflictingLocalDependencies;

function _assert() {
  const data = _interopRequireDefault(require("assert"));

  _assert = function () {
    return data;
  };

  return data;
}

function _diagnostic() {
  const data = _interopRequireDefault(require("@parcel/diagnostic"));

  _diagnostic = function () {
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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function npmSpecifierFromModuleRequest(moduleRequest) {
  return moduleRequest.range != null ? [moduleRequest.name, moduleRequest.range].join('@') : moduleRequest.name;
}

function moduleRequestsFromDependencyMap(dependencyMap) {
  return Object.entries(dependencyMap).map(([name, range]) => {
    (0, _assert().default)(typeof range === 'string');
    return {
      name,
      range
    };
  });
}

async function getConflictingLocalDependencies(fs, name, local, projectRoot) {
  let pkgPath = await (0, _utils().resolveConfig)(fs, local, ['package.json'], projectRoot);

  if (pkgPath == null) {
    return;
  }

  let pkgStr = await fs.readFile(pkgPath, 'utf8');
  let pkg;

  try {
    pkg = JSON.parse(pkgStr);
  } catch (e) {
    // TODO: codeframe
    throw new (_diagnostic().default)({
      diagnostic: {
        message: 'Failed to parse package.json',
        origin: '@parcel/package-manager'
      }
    });
  }

  if (typeof pkg !== 'object' || pkg == null) {
    // TODO: codeframe
    throw new (_diagnostic().default)({
      diagnostic: {
        message: 'Expected package.json contents to be an object.',
        origin: '@parcel/package-manager'
      }
    });
  }

  let fields = [];

  for (let field of ['dependencies', 'devDependencies', 'peerDependencies']) {
    if (typeof pkg[field] === 'object' && pkg[field] != null && pkg[field][name] != null) {
      fields.push(field);
    }
  }

  if (fields.length > 0) {
    return {
      filePath: pkgPath,
      json: pkgStr,
      fields
    };
  }
}