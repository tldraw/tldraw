"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _Npm = require("./Npm");

Object.keys(_Npm).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _Npm[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _Npm[key];
    }
  });
});

var _Pnpm = require("./Pnpm");

Object.keys(_Pnpm).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _Pnpm[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _Pnpm[key];
    }
  });
});

var _Yarn = require("./Yarn");

Object.keys(_Yarn).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _Yarn[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _Yarn[key];
    }
  });
});

var _MockPackageInstaller = require("./MockPackageInstaller");

Object.keys(_MockPackageInstaller).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _MockPackageInstaller[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _MockPackageInstaller[key];
    }
  });
});

var _NodePackageManager = require("./NodePackageManager");

Object.keys(_NodePackageManager).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _NodePackageManager[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _NodePackageManager[key];
    }
  });
});