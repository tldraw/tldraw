"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function _plugin() {
  const data = require("@parcel/plugin");

  _plugin = function () {
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

const CODE = `
var Refresh = require('react-refresh/runtime');

Refresh.injectIntoGlobalHook(window);
window.$RefreshReg$ = function() {};
window.$RefreshSig$ = function() {
  return function(type) {
    return type;
  };
};`;

var _default = new (_plugin().Runtime)({
  async apply({
    bundle,
    options
  }) {
    if (bundle.type !== 'js' || !options.hmrOptions || !bundle.env.isBrowser() || bundle.env.isWorker() || bundle.env.isWorklet() || options.mode !== 'development' || bundle.env.sourceType !== 'module') {
      return;
    }

    let entries = bundle.getEntryAssets();

    for (let entry of entries) {
      var _pkg$config, _pkg$config$dependenc, _pkg$config2, _pkg$config2$devDepen, _pkg$config3, _pkg$config3$peerDepe;

      // TODO: do this in loadConfig - but it doesn't have access to the bundle...
      let pkg = await (0, _utils().loadConfig)(options.inputFS, entry.filePath, ['package.json'], options.projectRoot);

      if (pkg !== null && pkg !== void 0 && (_pkg$config = pkg.config) !== null && _pkg$config !== void 0 && (_pkg$config$dependenc = _pkg$config.dependencies) !== null && _pkg$config$dependenc !== void 0 && _pkg$config$dependenc.react || pkg !== null && pkg !== void 0 && (_pkg$config2 = pkg.config) !== null && _pkg$config2 !== void 0 && (_pkg$config2$devDepen = _pkg$config2.devDependencies) !== null && _pkg$config2$devDepen !== void 0 && _pkg$config2$devDepen.react || pkg !== null && pkg !== void 0 && (_pkg$config3 = pkg.config) !== null && _pkg$config3 !== void 0 && (_pkg$config3$peerDepe = _pkg$config3.peerDependencies) !== null && _pkg$config3$peerDepe !== void 0 && _pkg$config3$peerDepe.react) {
        return {
          filePath: __filename,
          code: CODE,
          isEntry: true
        };
      }
    }
  }

});

exports.default = _default;