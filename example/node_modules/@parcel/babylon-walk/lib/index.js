"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  simple: true,
  ancestor: true,
  recursive: true,
  traverse: true
};
exports.simple = simple;
exports.ancestor = ancestor;
exports.recursive = recursive;
Object.defineProperty(exports, "traverse", {
  enumerable: true,
  get: function () {
    return _traverse.default;
  }
});

function t() {
  const data = _interopRequireWildcard(require("@babel/types"));

  t = function () {
    return data;
  };

  return data;
}

var _explode = _interopRequireDefault(require("./explode.js"));

var _traverse = _interopRequireDefault(require("./traverse"));

var _traverse2 = require("./traverse2");

Object.keys(_traverse2).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _traverse2[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _traverse2[key];
    }
  });
});

var _traverseAll = require("./traverse-all");

Object.keys(_traverseAll).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _traverseAll[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _traverseAll[key];
    }
  });
});

var _scope = require("./scope");

Object.keys(_scope).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _scope[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _scope[key];
    }
  });
});

var _types2 = require("./types");

Object.keys(_types2).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _types2[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _types2[key];
    }
  });
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function simple(node, _visitors, state) {
  if (!node) return;
  const visitors = (0, _explode.default)(_visitors);

  (function c(node) {
    if (!node) return;
    const {
      enter,
      exit
    } = visitors[node.type] || {};

    if (enter) {
      for (let visitor of enter) {
        visitor(node, state);
      }
    }

    for (let key of t().VISITOR_KEYS[node.type] || []) {
      // $FlowFixMe
      let subNode = node[key];

      if (Array.isArray(subNode)) {
        for (let subSubNode of subNode) {
          c(subSubNode);
        }
      } else {
        c(subNode);
      }
    }

    if (exit) {
      for (let visitor of exit) {
        visitor(node, state);
      }
    }
  })(node);
}

function ancestor(node, _visitors, state) {
  if (!node) return;
  const visitors = (0, _explode.default)(_visitors);
  let ancestors = [];

  (function c(node) {
    if (!node) return;
    const {
      enter,
      exit
    } = visitors[node.type] || {};
    let isNew = node != ancestors[ancestors.length - 1];
    if (isNew) ancestors.push(node);

    if (enter) {
      for (let visitor of enter) {
        // $FlowFixMe
        visitor(node, state || ancestors, ancestors);
      }
    }

    for (let key of t().VISITOR_KEYS[node.type] || []) {
      // $FlowFixMe
      let subNode = node[key];

      if (Array.isArray(subNode)) {
        for (let subSubNode of subNode) {
          c(subSubNode);
        }
      } else {
        c(subNode);
      }
    }

    if (exit) {
      for (let visitor of exit) {
        // $FlowFixMe
        visitor(node, state || ancestors, ancestors);
      }
    }

    if (isNew) ancestors.pop();
  })(node);
}

function recursive(node, _visitors, state) {
  if (!node) return;
  const visitors = (0, _explode.default)(_visitors);

  (function c(node) {
    if (!node) return;
    const {
      enter
    } = visitors[node.type] || {};

    if (enter && enter.length) {
      for (let visitor of enter) {
        visitor(node, state, c);
      }
    } else {
      for (let key of t().VISITOR_KEYS[node.type] || []) {
        // $FlowFixMe
        let subNode = node[key];

        if (Array.isArray(subNode)) {
          for (let subSubNode of subNode) {
            c(subSubNode);
          }
        } else {
          c(subNode);
        }
      }
    }
  })(node);
}