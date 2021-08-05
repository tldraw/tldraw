"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = objectHash;

function _crypto() {
  const data = _interopRequireDefault(require("crypto"));

  _crypto = function () {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function objectHash(object) {
  let hash = _crypto().default.createHash('md5');

  for (let key of Object.keys(object).sort()) {
    let val = object[key];

    if (typeof val === 'object' && val) {
      hash.update(key + objectHash(val));
    } else {
      hash.update(key + val);
    }
  }

  return hash.digest('hex');
}