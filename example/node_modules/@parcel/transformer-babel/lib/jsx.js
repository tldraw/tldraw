"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = isJSX;

function _path() {
  const data = _interopRequireDefault(require("path"));

  _path = function () {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const JSX_EXTENSIONS = new Set(['.jsx', '.tsx']);
const JSX_LIBRARIES = ['react', 'preact', 'nervejs', 'hyperapp'];
/**
 * Returns whether an asset is likely JSX. Attempts to detect react or react-like libraries
 * along with
 */

async function isJSX(options, config) {
  if (!config.isSource) {
    return false;
  }

  if (JSX_EXTENSIONS.has(_path().default.extname(config.searchPath))) {
    return true;
  }

  let pkg = await config.getPackage();

  if (pkg !== null && pkg !== void 0 && pkg.alias && pkg.alias['react']) {
    // e.g.: `{ alias: { "react": "preact/compat" } }`
    return true;
  } else {
    // Find a dependency that implies JSX syntax.
    return JSX_LIBRARIES.some(libName => pkg && (pkg.dependencies && pkg.dependencies[libName] || pkg.devDependencies && pkg.devDependencies[libName] || pkg.peerDependencies && pkg.peerDependencies[libName]));
  }
}