"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Pnpm = void 0;

function _commandExists() {
  const data = _interopRequireDefault(require("command-exists"));

  _commandExists = function () {
    return data;
  };

  return data;
}

function _crossSpawn() {
  const data = _interopRequireDefault(require("cross-spawn"));

  _crossSpawn = function () {
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

function _split() {
  const data = _interopRequireDefault(require("split2"));

  _split = function () {
    return data;
  };

  return data;
}

var _JSONParseStream = _interopRequireDefault(require("./JSONParseStream"));

var _promiseFromProcess = _interopRequireDefault(require("./promiseFromProcess"));

function _core() {
  const data = require("@parcel/core");

  _core = function () {
    return data;
  };

  return data;
}

var _utils = require("./utils");

var _package = _interopRequireDefault(require("../package.json"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// $FlowFixMe
const PNPM_CMD = 'pnpm';
let hasPnpm;

class Pnpm {
  static async exists() {
    if (hasPnpm != null) {
      return hasPnpm;
    }

    try {
      hasPnpm = Boolean(await (0, _commandExists().default)('pnpm'));
    } catch (err) {
      hasPnpm = false;
    }

    return hasPnpm;
  }

  async install({
    modules,
    cwd,
    saveDev = true
  }) {
    let args = ['add', '--reporter', 'ndjson'];

    if (saveDev) {
      args.push('-D');
    }

    args = args.concat(modules.map(_utils.npmSpecifierFromModuleRequest));
    let env = {};

    for (let key in process.env) {
      if (!key.startsWith('npm_') && key !== 'INIT_CWD' && key !== 'NODE_ENV') {
        env[key] = process.env[key];
      }
    }

    let addedCount = 0,
        removedCount = 0;
    let installProcess = (0, _crossSpawn().default)(PNPM_CMD, args, {
      cwd,
      env
    });
    installProcess.stdout.pipe((0, _split().default)()).pipe(new _JSONParseStream.default()).on('error', e => {
      _logger().default.warn({
        origin: '@parcel/package-manager',
        message: e.chunk,
        stack: e.stack
      });
    }).on('data', json => {
      if (json.level === 'error') {
        _logger().default.error({
          origin: '@parcel/package-manager',
          message: json.err.message,
          stack: json.err.stack
        });
      } else if (json.level === 'info' && typeof json.message === 'string') {
        _logger().default.info({
          origin: '@parcel/package-manager',
          message: prefix(json.message)
        });
      } else if (json.name === 'pnpm:stats') {
        var _json$added, _json$removed;

        addedCount += (_json$added = json.added) !== null && _json$added !== void 0 ? _json$added : 0;
        removedCount += (_json$removed = json.removed) !== null && _json$removed !== void 0 ? _json$removed : 0;
      }
    });
    let stderr = [];
    installProcess.stderr.on('data', str => {
      stderr.push(str.toString());
    }).on('error', e => {
      _logger().default.warn({
        origin: '@parcel/package-manager',
        message: e.message
      });
    });

    try {
      await (0, _promiseFromProcess.default)(installProcess);

      if (addedCount > 0 || removedCount > 0) {
        _logger().default.log({
          origin: '@parcel/package-manager',
          message: `Added ${addedCount} and ${removedCount > 0 ? `removed ${removedCount}` : ''} packages via pnpm`
        });
      } // Since we succeeded, stderr might have useful information not included
      // in the json written to stdout. It's also not necessary to log these as
      // errors as they often aren't.


      for (let message of stderr) {
        _logger().default.log({
          origin: '@parcel/package-manager',
          message
        });
      }
    } catch (e) {
      throw new Error('pnpm failed to install modules');
    }
  }

}

exports.Pnpm = Pnpm;

function prefix(message) {
  return 'pnpm: ' + message;
}

(0, _core().registerSerializableClass)(`${_package.default.version}:Pnpm`, Pnpm);