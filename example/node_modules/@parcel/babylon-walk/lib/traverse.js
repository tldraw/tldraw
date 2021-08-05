"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = traverse;

function t() {
  const data = _interopRequireWildcard(require("@babel/types"));

  t = function () {
    return data;
  };

  return data;
}

function _assert() {
  const data = _interopRequireDefault(require("assert"));

  _assert = function () {
    return data;
  };

  return data;
}

var _explode = _interopRequireDefault(require("./explode.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

class Path {
  _skipped = false;
  _removed = false;

  constructor(node, parent, listkey, key) {
    this.node = node;
    this.parent = parent;
    this.listkey = listkey;
    this.key = key;
  }

  replaceWith(n) {
    this.node = n; // $FlowFixMe

    let p = this.listkey ? this.parent[this.listkey] : this.parent; // $FlowFixMe

    p[this.key] = this.node;
  }

  skip() {
    this._skipped = true;
  }

  remove() {
    this._removed = true;
    (0, _assert().default)(this.listkey && typeof this.key === 'number'); // $FlowFixMe

    this.parent[this.listkey].splice(this.key, 1);
  }

}

function traverse(node, visitors, state) {
  traverseWalk((0, _explode.default)(visitors), state, node, null, null, null);
}

function traverseWalk(visitors, state, node, parent, listkey, key) {
  if (!node || visitors.shouldSkip && visitors.shouldSkip(node) === true) {
    return;
  }

  const {
    enter,
    exit
  } = visitors[node.type] || {}; // $FlowFixMe

  const path = new Path(node, parent, listkey, key);

  if (enter) {
    for (let visitor of enter) {
      visitor(path, state);
      if (path._skipped || path._removed) return path._removed;
    }
  }

  for (let key of t().VISITOR_KEYS[node.type] || []) {
    // $FlowFixMe
    let subNode = node[key];

    if (Array.isArray(subNode)) {
      for (let i = 0; i < subNode.length; i++) {
        if (traverseWalk(visitors, state, subNode[i], node, key, i) === true) {
          i--;
        }
      }
    } else {
      traverseWalk(visitors, state, subNode, node, null, key);
    }
  }

  if (exit) {
    for (let visitor of exit) {
      visitor(path, state);
    }
  }
}