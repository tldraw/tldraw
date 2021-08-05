"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MemoryFS = void 0;

function _path() {
  const data = _interopRequireDefault(require("path"));

  _path = function () {
    return data;
  };

  return data;
}

function _stream() {
  const data = require("stream");

  _stream = function () {
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

function _workers() {
  const data = _interopRequireWildcard(require("@parcel/workers"));

  _workers = function () {
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

function _events() {
  const data = _interopRequireDefault(require("events"));

  _events = function () {
    return data;
  };

  return data;
}

var _find = require("./find");

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const instances = new Map();
let id = 0;

class MemoryFS {
  _numWorkerInstances = 0;
  _workerRegisterResolves = [];
  _emitter = new (_events().default)();

  constructor(workerFarm) {
    this.farm = workerFarm;
    this.dirs = new Map([['/', new Directory()]]);
    this.files = new Map();
    this.symlinks = new Map();
    this.watchers = new Map();
    this.events = [];
    this.id = id++;
    this._cwd = '/';
    this._workerHandles = [];
    this._eventQueue = [];
    instances.set(this.id, this);

    this._emitter.on('allWorkersRegistered', () => {
      for (let resolve of this._workerRegisterResolves) {
        resolve();
      }

      this._workerRegisterResolves = [];
    });
  }

  static deserialize(opts) {
    let existing = instances.get(opts.id);

    if (existing != null) {
      // Correct the count of worker instances since serialization assumes a new instance is created
      _workers().default.getWorkerApi().runHandle(opts.handle, ['decrementWorkerInstance', []]);

      return existing;
    }

    let fs = new WorkerFS(opts.id, (0, _nullthrows().default)(opts.handle));
    fs.dirs = opts.dirs;
    fs.files = opts.files;
    fs.symlinks = opts.symlinks;
    return fs;
  }

  serialize() {
    if (!this.handle) {
      this.handle = this.farm.createReverseHandle((fn, args) => {
        // $FlowFixMe
        return this[fn](...args);
      });
    } // If a worker instance already exists, it will decrement this number


    this._numWorkerInstances++;
    return {
      $$raw: false,
      id: this.id,
      handle: this.handle,
      dirs: this.dirs,
      files: this.files,
      symlinks: this.symlinks
    };
  }

  decrementWorkerInstance() {
    this._numWorkerInstances--;

    if (this._numWorkerInstances === this._workerHandles.length) {
      this._emitter.emit('allWorkersRegistered');
    }
  }

  cwd() {
    return this._cwd;
  }

  chdir(dir) {
    this._cwd = dir;
  }

  _normalizePath(filePath, realpath = true) {
    filePath = _path().default.resolve(this.cwd(), filePath); // get realpath by following symlinks

    if (realpath) {
      let {
        root,
        dir,
        base
      } = _path().default.parse(filePath);

      let parts = dir.slice(root.length).split(_path().default.sep).concat(base);
      let res = root;

      for (let part of parts) {
        res = _path().default.join(res, part);
        let symlink = this.symlinks.get(res);

        if (symlink) {
          res = symlink;
        }
      }

      return res;
    }

    return filePath;
  }

  async writeFile(filePath, contents, options) {
    filePath = this._normalizePath(filePath);

    if (this.dirs.has(filePath)) {
      throw new FSError('EISDIR', filePath, 'is a directory');
    }

    let dir = _path().default.dirname(filePath);

    if (!this.dirs.has(dir)) {
      throw new FSError('ENOENT', dir, 'does not exist');
    }

    let buffer = makeShared(contents);
    let file = this.files.get(filePath);
    let mode = options && options.mode || 0o666;

    if (file) {
      file.write(buffer, mode);
      this.files.set(filePath, file);
    } else {
      this.files.set(filePath, new File(buffer, mode));
    }

    await this._sendWorkerEvent({
      type: 'writeFile',
      path: filePath,
      entry: this.files.get(filePath)
    });

    this._triggerEvent({
      type: file ? 'update' : 'create',
      path: filePath
    });
  } // eslint-disable-next-line require-await


  async readFile(filePath, encoding) {
    return this.readFileSync(filePath, encoding);
  }

  readFileSync(filePath, encoding) {
    filePath = this._normalizePath(filePath);
    let file = this.files.get(filePath);

    if (file == null) {
      throw new FSError('ENOENT', filePath, 'does not exist');
    }

    let buffer = file.read();

    if (encoding) {
      return buffer.toString(encoding);
    }

    return buffer;
  }

  async copyFile(source, destination) {
    let contents = await this.readFile(source);
    await this.writeFile(destination, contents);
  }

  statSync(filePath) {
    filePath = this._normalizePath(filePath);
    let dir = this.dirs.get(filePath);

    if (dir) {
      return dir.stat();
    }

    let file = this.files.get(filePath);

    if (file == null) {
      throw new FSError('ENOENT', filePath, 'does not exist');
    }

    return file.stat();
  } // eslint-disable-next-line require-await


  async stat(filePath) {
    return this.statSync(filePath);
  }

  readdirSync(dir, opts) {
    dir = this._normalizePath(dir);

    if (!this.dirs.has(dir)) {
      throw new FSError('ENOENT', dir, 'does not exist');
    }

    dir += _path().default.sep;
    let res = [];

    for (let [filePath, entry] of this.dirs) {
      if (filePath.startsWith(dir) && filePath.indexOf(_path().default.sep, dir.length) === -1) {
        let name = filePath.slice(dir.length);

        if (opts !== null && opts !== void 0 && opts.withFileTypes) {
          res.push(new Dirent(name, entry));
        } else {
          res.push(name);
        }
      }
    }

    for (let [filePath, entry] of this.files) {
      if (filePath.startsWith(dir) && filePath.indexOf(_path().default.sep, dir.length) === -1) {
        let name = filePath.slice(dir.length);

        if (opts !== null && opts !== void 0 && opts.withFileTypes) {
          res.push(new Dirent(name, entry));
        } else {
          res.push(name);
        }
      }
    }

    for (let [from] of this.symlinks) {
      if (from.startsWith(dir) && from.indexOf(_path().default.sep, dir.length) === -1) {
        let name = from.slice(dir.length);

        if (opts !== null && opts !== void 0 && opts.withFileTypes) {
          res.push(new Dirent(name, {
            mode: S_IFLNK
          }));
        } else {
          res.push(name);
        }
      }
    }

    return res;
  } // eslint-disable-next-line require-await


  async readdir(dir, opts) {
    return this.readdirSync(dir, opts);
  }

  async unlink(filePath) {
    filePath = this._normalizePath(filePath);

    if (!this.files.has(filePath) && !this.dirs.has(filePath)) {
      throw new FSError('ENOENT', filePath, 'does not exist');
    }

    this.files.delete(filePath);
    this.dirs.delete(filePath);
    this.watchers.delete(filePath);
    await this._sendWorkerEvent({
      type: 'unlink',
      path: filePath
    });

    this._triggerEvent({
      type: 'delete',
      path: filePath
    });

    return Promise.resolve();
  }

  async mkdirp(dir) {
    dir = this._normalizePath(dir);

    if (this.dirs.has(dir)) {
      return Promise.resolve();
    }

    if (this.files.has(dir)) {
      throw new FSError('ENOENT', dir, 'is not a directory');
    }

    let root = _path().default.parse(dir).root;

    while (dir !== root) {
      if (this.dirs.has(dir)) {
        break;
      }

      this.dirs.set(dir, new Directory());
      await this._sendWorkerEvent({
        type: 'mkdir',
        path: dir
      });

      this._triggerEvent({
        type: 'create',
        path: dir
      });

      dir = _path().default.dirname(dir);
    }

    return Promise.resolve();
  }

  async rimraf(filePath) {
    filePath = this._normalizePath(filePath);

    if (this.dirs.has(filePath)) {
      let dir = filePath + _path().default.sep;

      for (let filePath of this.files.keys()) {
        if (filePath.startsWith(dir)) {
          this.files.delete(filePath);
          await this._sendWorkerEvent({
            type: 'unlink',
            path: filePath
          });

          this._triggerEvent({
            type: 'delete',
            path: filePath
          });
        }
      }

      for (let dirPath of this.dirs.keys()) {
        if (dirPath.startsWith(dir)) {
          this.dirs.delete(dirPath);
          this.watchers.delete(dirPath);
          await this._sendWorkerEvent({
            type: 'unlink',
            path: filePath
          });

          this._triggerEvent({
            type: 'delete',
            path: dirPath
          });
        }
      }

      for (let filePath of this.symlinks.keys()) {
        if (filePath.startsWith(dir)) {
          this.symlinks.delete(filePath);
          await this._sendWorkerEvent({
            type: 'unlink',
            path: filePath
          });
        }
      }

      this.dirs.delete(filePath);
      await this._sendWorkerEvent({
        type: 'unlink',
        path: filePath
      });

      this._triggerEvent({
        type: 'delete',
        path: filePath
      });
    } else if (this.files.has(filePath)) {
      this.files.delete(filePath);
      await this._sendWorkerEvent({
        type: 'unlink',
        path: filePath
      });

      this._triggerEvent({
        type: 'delete',
        path: filePath
      });
    }

    return Promise.resolve();
  }

  async ncp(source, destination) {
    source = this._normalizePath(source);

    if (this.dirs.has(source)) {
      if (!this.dirs.has(destination)) {
        this.dirs.set(destination, new Directory());
        await this._sendWorkerEvent({
          type: 'mkdir',
          path: destination
        });

        this._triggerEvent({
          type: 'create',
          path: destination
        });
      }

      let dir = source + _path().default.sep;

      for (let dirPath of this.dirs.keys()) {
        if (dirPath.startsWith(dir)) {
          let destName = _path().default.join(destination, dirPath.slice(dir.length));

          if (!this.dirs.has(destName)) {
            this.dirs.set(destName, new Directory());
            await this._sendWorkerEvent({
              type: 'mkdir',
              path: destination
            });

            this._triggerEvent({
              type: 'create',
              path: destName
            });
          }
        }
      }

      for (let [filePath, file] of this.files) {
        if (filePath.startsWith(dir)) {
          let destName = _path().default.join(destination, filePath.slice(dir.length));

          let exists = this.files.has(destName);
          this.files.set(destName, file);
          await this._sendWorkerEvent({
            type: 'writeFile',
            path: destName,
            entry: file
          });

          this._triggerEvent({
            type: exists ? 'update' : 'create',
            path: destName
          });
        }
      }
    } else {
      await this.copyFile(source, destination);
    }
  }

  createReadStream(filePath) {
    return new ReadStream(this, filePath);
  }

  createWriteStream(filePath, options) {
    return new WriteStream(this, filePath, options);
  }

  realpathSync(filePath) {
    return this._normalizePath(filePath);
  } // eslint-disable-next-line require-await


  async realpath(filePath) {
    return this.realpathSync(filePath);
  }

  async symlink(target, path) {
    target = this._normalizePath(target);
    path = this._normalizePath(path);
    this.symlinks.set(path, target);
    await this._sendWorkerEvent({
      type: 'symlink',
      path,
      target
    });
  }

  existsSync(filePath) {
    filePath = this._normalizePath(filePath);
    return this.files.has(filePath) || this.dirs.has(filePath);
  } // eslint-disable-next-line require-await


  async exists(filePath) {
    return this.existsSync(filePath);
  }

  _triggerEvent(event) {
    this.events.push(event);

    if (this.watchers.size === 0) {
      return;
    } // Batch events


    this._eventQueue.push(event);

    clearTimeout(this._watcherTimer);
    this._watcherTimer = setTimeout(() => {
      let events = this._eventQueue;
      this._eventQueue = [];

      for (let [dir, watchers] of this.watchers) {
        if (!dir.endsWith(_path().default.sep)) {
          dir += _path().default.sep;
        }

        if (event.path.startsWith(dir)) {
          for (let watcher of watchers) {
            watcher.trigger(events);
          }
        }
      }
    }, 50);
  }

  _registerWorker(handle) {
    this._workerHandles.push(handle);

    if (this._numWorkerInstances === this._workerHandles.length) {
      this._emitter.emit('allWorkersRegistered');
    }
  }

  async _sendWorkerEvent(event) {
    // Wait for worker instances to register their handles
    while (this._workerHandles.length < this._numWorkerInstances) {
      await new Promise(resolve => this._workerRegisterResolves.push(resolve));
    }

    await Promise.all(this._workerHandles.map(workerHandle => this.farm.workerApi.runHandle(workerHandle, [event])));
  }

  watch(dir, fn, opts) {
    dir = this._normalizePath(dir);
    let watcher = new Watcher(fn, opts);
    let watchers = this.watchers.get(dir);

    if (!watchers) {
      watchers = new Set();
      this.watchers.set(dir, watchers);
    }

    watchers.add(watcher);
    return Promise.resolve({
      unsubscribe: () => {
        watchers = (0, _nullthrows().default)(watchers);
        watchers.delete(watcher);

        if (watchers.size === 0) {
          this.watchers.delete(dir);
        }

        return Promise.resolve();
      }
    });
  }

  async getEventsSince(dir, snapshot, opts) {
    let contents = await this.readFile(snapshot, 'utf8');
    let len = Number(contents);
    let events = this.events.slice(len);
    let ignore = opts.ignore;

    if (ignore) {
      events = events.filter(event => !ignore.some(i => event.path.startsWith(i + _path().default.sep)));
    }

    return events;
  }

  async writeSnapshot(dir, snapshot) {
    await this.writeFile(snapshot, '' + this.events.length);
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

exports.MemoryFS = MemoryFS;

class Watcher {
  constructor(fn, options) {
    this.fn = fn;
    this.options = options;
  }

  trigger(events) {
    let ignore = this.options.ignore;

    if (ignore) {
      events = events.filter(event => !ignore.some(i => event.path.startsWith(i + _path().default.sep)));
    }

    if (events.length > 0) {
      this.fn(null, events);
    }
  }

}

class FSError extends Error {
  constructor(code, path, message) {
    var _Error$captureStackTr;

    super(`${code}: ${path} ${message}`);
    this.name = 'FSError';
    this.code = code;
    this.path = path;
    (_Error$captureStackTr = Error.captureStackTrace) === null || _Error$captureStackTr === void 0 ? void 0 : _Error$captureStackTr.call(Error, this, this.constructor);
  }

}

class ReadStream extends _stream().Readable {
  constructor(fs, filePath) {
    super();
    this.fs = fs;
    this.filePath = filePath;
    this.reading = false;
    this.bytesRead = 0;
  }

  _read() {
    if (this.reading) {
      return;
    }

    this.reading = true;
    this.fs.readFile(this.filePath).then(res => {
      this.bytesRead += res.byteLength;
      this.push(res);
      this.push(null);
    }, err => {
      this.emit('error', err);
    });
  }

}

class WriteStream extends _stream().Writable {
  constructor(fs, filePath, options) {
    super({
      emitClose: true,
      autoDestroy: true
    });
    this.fs = fs;
    this.filePath = filePath;
    this.options = options;
    this.buffer = Buffer.alloc(0);
  }

  _write(chunk, encoding, callback) {
    let c = typeof chunk === 'string' ? Buffer.from(chunk, encoding) : chunk;
    this.buffer = Buffer.concat([this.buffer, c]);
    callback();
  }

  _final(callback) {
    this.fs.writeFile(this.filePath, this.buffer, this.options).then(callback).catch(callback);
  }

}

const S_IFREG = 0o100000;
const S_IFDIR = 0o040000;
const S_IFLNK = 0o120000;

class Entry {
  constructor(mode) {
    this.mode = mode;
    let now = Date.now();
    this.atime = now;
    this.mtime = now;
    this.ctime = now;
    this.birthtime = now;
  }

  access() {
    let now = Date.now();
    this.atime = now;
    this.ctime = now;
  }

  modify(mode) {
    let now = Date.now();
    this.mtime = now;
    this.ctime = now;
    this.mode = mode;
  }

  getSize() {
    return 0;
  }

  stat() {
    return new Stat(this);
  }

}

class Stat {
  dev = 0;
  ino = 0;
  nlink = 0;
  uid = 0;
  gid = 0;
  rdev = 0;
  blksize = 0;
  blocks = 0;

  constructor(entry) {
    this.mode = entry.mode;
    this.size = entry.getSize();
    this.atimeMs = entry.atime;
    this.mtimeMs = entry.mtime;
    this.ctimeMs = entry.ctime;
    this.birthtimeMs = entry.birthtime;
    this.atime = new Date(entry.atime);
    this.mtime = new Date(entry.mtime);
    this.ctime = new Date(entry.ctime);
    this.birthtime = new Date(entry.birthtime);
  }

  isFile() {
    return Boolean(this.mode & S_IFREG);
  }

  isDirectory() {
    return Boolean(this.mode & S_IFDIR);
  }

  isBlockDevice() {
    return false;
  }

  isCharacterDevice() {
    return false;
  }

  isSymbolicLink() {
    return false;
  }

  isFIFO() {
    return false;
  }

  isSocket() {
    return false;
  }

}

class Dirent {
  #mode;

  constructor(name, entry) {
    this.name = name;
    this.#mode = entry.mode;
  }

  isFile() {
    return Boolean(this.#mode & S_IFREG);
  }

  isDirectory() {
    return Boolean(this.#mode & S_IFDIR);
  }

  isBlockDevice() {
    return false;
  }

  isCharacterDevice() {
    return false;
  }

  isSymbolicLink() {
    return Boolean(this.#mode & S_IFLNK);
  }

  isFIFO() {
    return false;
  }

  isSocket() {
    return false;
  }

}

class File extends Entry {
  constructor(buffer, mode) {
    super(S_IFREG | mode);
    this.buffer = buffer;
  }

  read() {
    super.access();
    return Buffer.from(this.buffer);
  }

  write(buffer, mode) {
    super.modify(S_IFREG | mode);
    this.buffer = buffer;
  }

  getSize() {
    return this.buffer.byteLength;
  }

}

class Directory extends Entry {
  constructor() {
    super(S_IFDIR);
  }

}

function makeShared(contents) {
  if (typeof contents !== 'string' && contents.buffer instanceof SharedArrayBuffer) {
    return contents;
  }

  let length = Buffer.byteLength(contents);
  let shared = new SharedArrayBuffer(length);
  let buffer = Buffer.from(shared);

  if (typeof contents === 'string') {
    buffer.write(contents);
  } else {
    buffer.set(contents);
  }

  return buffer;
}

class WorkerFS extends MemoryFS {
  constructor(id, handle) {
    // TODO Make this not a subclass
    // $FlowFixMe
    super();
    this.id = id;

    this.handleFn = (methodName, args) => _workers().default.getWorkerApi().runHandle(handle, [methodName, args]);

    this.handleFn('_registerWorker', [_workers().default.getWorkerApi().createReverseHandle(event => {
      switch (event.type) {
        case 'writeFile':
          this.files.set(event.path, event.entry);
          break;

        case 'unlink':
          this.files.delete(event.path);
          this.dirs.delete(event.path);
          this.symlinks.delete(event.path);
          break;

        case 'mkdir':
          this.dirs.set(event.path, new Directory());
          break;

        case 'symlink':
          this.symlinks.set(event.path, event.target);
          break;
      }
    })]);
  }

  static deserialize(opts) {
    return (0, _nullthrows().default)(instances.get(opts.id));
  }

  serialize() {
    // $FlowFixMe
    return {
      id: this.id
    };
  }

  writeFile(filePath, contents, options) {
    super.writeFile(filePath, contents, options);
    let buffer = makeShared(contents);
    return this.handleFn('writeFile', [filePath, buffer, options]);
  }

  unlink(filePath) {
    super.unlink(filePath);
    return this.handleFn('unlink', [filePath]);
  }

  mkdirp(dir) {
    super.mkdirp(dir);
    return this.handleFn('mkdirp', [dir]);
  }

  rimraf(filePath) {
    super.rimraf(filePath);
    return this.handleFn('rimraf', [filePath]);
  }

  ncp(source, destination) {
    super.ncp(source, destination);
    return this.handleFn('ncp', [source, destination]);
  }

  symlink(target, path) {
    super.symlink(target, path);
    return this.handleFn('symlink', [target, path]);
  }

}

(0, _core().registerSerializableClass)(`${_package.default.version}:MemoryFS`, MemoryFS);
(0, _core().registerSerializableClass)(`${_package.default.version}:WorkerFS`, WorkerFS);
(0, _core().registerSerializableClass)(`${_package.default.version}:Stat`, Stat);
(0, _core().registerSerializableClass)(`${_package.default.version}:File`, File);
(0, _core().registerSerializableClass)(`${_package.default.version}:Directory`, Directory);