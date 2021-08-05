"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.OverlayFS = void 0;

function _core() {
  const data = require("@parcel/core");

  _core = function () {
    return data;
  };

  return data;
}

var _package = _interopRequireDefault(require("../package.json"));

var _find = require("./find");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function read(method) {
  return async function (...args) {
    try {
      return await this.writable[method](...args);
    } catch (err) {
      return this.readable[method](...args);
    }
  };
}

function readSync(method) {
  return function (...args) {
    try {
      return this.writable[method](...args);
    } catch (err) {
      return this.readable[method](...args);
    }
  };
}

function write(method) {
  return function (...args) {
    return this.writable[method](...args);
  };
}

function checkExists(method) {
  return function (filePath, ...args) {
    if (this.writable.existsSync(filePath)) {
      return this.writable[method](filePath, ...args);
    }

    return this.readable[method](filePath, ...args);
  };
}

class OverlayFS {
  constructor(writable, readable) {
    this.writable = writable;
    this.readable = readable;
  }

  static deserialize(opts) {
    return new OverlayFS(opts.writable, opts.readable);
  }

  serialize() {
    return {
      $$raw: false,
      writable: this.writable,
      readable: this.readable
    };
  }

  readFile = read('readFile');
  writeFile = write('writeFile');

  async copyFile(source, destination) {
    if (await this.writable.exists(source)) {
      await this.writable.writeFile(destination, await this.writable.readFile(source));
    } else {
      await this.writable.writeFile(destination, await this.readable.readFile(source));
    }
  }

  stat = read('stat');
  unlink = write('unlink');
  mkdirp = write('mkdirp');
  rimraf = write('rimraf');
  ncp = write('ncp');
  createReadStream = checkExists('createReadStream');
  createWriteStream = write('createWriteStream');
  cwd = readSync('cwd');
  chdir = readSync('chdir');
  realpath = checkExists('realpath');
  readFileSync = readSync('readFileSync');
  statSync = readSync('statSync');
  existsSync = readSync('existsSync');
  realpathSync = checkExists('realpathSync');

  async exists(filePath) {
    return (await this.writable.exists(filePath)) || this.readable.exists(filePath);
  }

  async readdir(path, opts) {
    // Read from both filesystems and merge the results
    let writable = [];
    let readable = [];

    try {
      writable = await this.writable.readdir(path, opts);
    } catch (err) {// do nothing
    }

    try {
      readable = await this.readable.readdir(path, opts);
    } catch (err) {// do nothing
    }

    return Array.from(new Set([...writable, ...readable]));
  }

  readdirSync(path, opts) {
    // Read from both filesystems and merge the results
    let writable = [];
    let readable = [];

    try {
      writable = this.writable.readdirSync(path, opts);
    } catch (err) {// do nothing
    }

    try {
      readable = this.readable.readdirSync(path, opts);
    } catch (err) {// do nothing
    }

    return Array.from(new Set([...writable, ...readable]));
  }

  async watch(dir, fn, opts) {
    let writableSubscription = await this.writable.watch(dir, fn, opts);
    let readableSubscription = await this.readable.watch(dir, fn, opts);
    return {
      unsubscribe: async () => {
        await writableSubscription.unsubscribe();
        await readableSubscription.unsubscribe();
      }
    };
  }

  async getEventsSince(dir, snapshot, opts) {
    let writableEvents = await this.writable.getEventsSince(dir, snapshot, opts);
    let readableEvents = await this.readable.getEventsSince(dir, snapshot, opts);
    return [...writableEvents, ...readableEvents];
  }

  async writeSnapshot(dir, snapshot, opts) {
    await this.writable.writeSnapshot(dir, snapshot, opts);
  }

  findAncestorFile(fileNames, fromDir, root) {
    return (0, _find.findAncestorFile)(this, fileNames, fromDir, root);
  }

  findNodeModule(moduleName, fromDir) {
    return (0, _find.findNodeModule)(this, moduleName, fromDir);
  }

  findFirstFile(filePaths) {
    return (0, _find.findFirstFile)(this, filePaths);
  }

}

exports.OverlayFS = OverlayFS;
(0, _core().registerSerializableClass)(`${_package.default.version}:OverlayFS`, OverlayFS);