"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _LMDBCache = require("./LMDBCache");

Object.keys(_LMDBCache).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _LMDBCache[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _LMDBCache[key];
    }
  });
});

var _FSCache = require("./FSCache");

Object.keys(_FSCache).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _FSCache[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _FSCache[key];
    }
  });
});