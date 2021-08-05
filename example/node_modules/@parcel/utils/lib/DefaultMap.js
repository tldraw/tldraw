"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DefaultWeakMap = exports.DefaultMap = void 0;

class DefaultMap extends Map {
  constructor(getDefault, entries) {
    super(entries);
    this._getDefault = getDefault;
  }

  get(key) {
    let ret;

    if (this.has(key)) {
      ret = super.get(key);
    } else {
      ret = this._getDefault(key);
      this.set(key, ret);
    } // $FlowFixMe


    return ret;
  }

} // Duplicated from DefaultMap implementation for Flow
// Roughly mirrors https://github.com/facebook/flow/blob/2eb5a78d92c167117ba9caae070afd2b9f598599/lib/core.js#L617


exports.DefaultMap = DefaultMap;

class DefaultWeakMap extends WeakMap {
  constructor(getDefault, entries) {
    super(entries);
    this._getDefault = getDefault;
  }

  get(key) {
    let ret;

    if (this.has(key)) {
      ret = super.get(key);
    } else {
      ret = this._getDefault(key);
      this.set(key, ret);
    } // $FlowFixMe


    return ret;
  }

}

exports.DefaultWeakMap = DefaultWeakMap;