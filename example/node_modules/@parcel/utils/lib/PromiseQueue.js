"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _Deferred = require("./Deferred");

class PromiseQueue {
  _numRunning = 0;
  _queue = [];
  _runPromise = null;
  _count = 0;
  _results = [];

  constructor(opts = {
    maxConcurrent: Infinity
  }) {
    if (opts.maxConcurrent <= 0) {
      throw new TypeError('maxConcurrent must be a positive, non-zero value');
    }

    this._maxConcurrent = opts.maxConcurrent;
  }

  getNumWaiting() {
    return this._queue.length;
  }

  add(fn) {
    return new Promise((resolve, reject) => {
      let i = this._count++;

      this._queue.push(() => fn().then(result => {
        this._results[i] = result;
        resolve(result);
      }, err => {
        reject(err);
        throw err;
      }));

      if (this._numRunning > 0 && this._numRunning < this._maxConcurrent) {
        this._next();
      }
    });
  }

  run() {
    if (this._runPromise != null) {
      return this._runPromise;
    }

    if (this._queue.length === 0) {
      return Promise.resolve([]);
    }

    let {
      deferred,
      promise
    } = (0, _Deferred.makeDeferredWithPromise)();
    this._deferred = deferred;
    this._runPromise = promise;

    while (this._queue.length && this._numRunning < this._maxConcurrent) {
      this._next();
    }

    return promise;
  }

  async _next() {
    let fn = this._queue.shift();

    await this._runFn(fn);

    if (this._queue.length) {
      this._next();
    } else if (this._numRunning === 0) {
      this._done();
    }
  }

  async _runFn(fn) {
    this._numRunning++;

    try {
      await fn();
    } catch (e) {
      // Only store the first error that occurs.
      // We don't reject immediately so that any other concurrent
      // requests have time to complete.
      if (this._error == null) {
        this._error = e;
      }
    } finally {
      this._numRunning--;
    }
  }

  _resetState() {
    this._queue = [];
    this._count = 0;
    this._results = [];
    this._runPromise = null;
    this._numRunning = 0;
    this._deferred = null;
  }

  _done() {
    if (this._deferred != null) {
      if (this._error != null) {
        this._deferred.reject(this._error);
      } else {
        this._deferred.resolve(this._results);
      }
    }

    this._resetState();
  }

}

exports.default = PromiseQueue;