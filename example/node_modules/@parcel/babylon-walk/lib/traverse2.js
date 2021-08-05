"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.traverse2 = traverse2;
exports.mergeVisitors = mergeVisitors;
exports.REMOVE = exports.SKIP = void 0;

function t() {
  const data = _interopRequireWildcard(require("@babel/types"));

  t = function () {
    return data;
  };

  return data;
}

var _explode = _interopRequireDefault(require("./explode.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const SKIP = Symbol('traverse.SKIP');
exports.SKIP = SKIP;
const REMOVE = Symbol('traverse.REMOVE');
exports.REMOVE = REMOVE;

function traverse2(node, visitors, state) {
  let revisit = [];
  traverseWalk((0, _explode.default)(visitors), [], revisit, state, node);

  for (let fn of revisit) {
    fn();
  }
}

function traverseWalk(visitors, ancestors, revisit, state, node) {
  if (!node || visitors.shouldSkip && visitors.shouldSkip(node) === true) {
    return;
  }

  let isNew = node != ancestors[ancestors.length - 1];
  if (isNew) ancestors.push(node);
  const {
    enter,
    exit
  } = visitors[node.type] || {};

  if (enter) {
    for (let visitor of enter) {
      let res = visitor(node, state, ancestors);

      if (res != null) {
        if (isNew) ancestors.pop();
        return res;
      }
    }
  }

  for (let key of t().VISITOR_KEYS[node.type] || []) {
    // $FlowFixMe
    let subNode = node[key];

    if (Array.isArray(subNode)) {
      let revisitDiff = 0;

      for (let i = 0; i < subNode.length; i++) {
        let res = traverseWalk(visitors, ancestors, revisit, state, subNode[i]);

        if (res === REMOVE) {
          subNode.splice(i, 1);
          i--;
        } else if (res !== SKIP && res != null) {
          if (typeof res === 'function') {
            revisit.push(() => {
              let index = i + revisitDiff;
              let r = replaceArray(subNode, index, res());
              revisitDiff += r - index;
            });
          } else {
            i = replaceArray(subNode, i, res);
          }
        }
      }
    } else {
      let res = traverseWalk(visitors, ancestors, revisit, state, subNode);

      if (res === REMOVE) {
        if (isNew) ancestors.pop();
        return REMOVE;
      } else if (res !== SKIP && res != null) {
        if (typeof res === 'function') {
          revisit.push(() => {
            let n = res();

            if (n != null) {
              // $FlowFixMe
              node[key] = n;
            }
          });
        } else {
          // $FlowFixMe
          node[key] = res;
        }
      }
    }
  }

  if (exit) {
    for (let visitor of exit) {
      let res = visitor(node, state, ancestors);

      if (res != null) {
        if (isNew) ancestors.pop();
        return res;
      }
    }
  }

  if (isNew) ancestors.pop();
}

function replaceArray(subNode, i, res) {
  if (res === REMOVE) {
    subNode.splice(i, 1);
    i--;
  } else if (Array.isArray(res)) {
    subNode.splice(i, 1, ...res);

    if (res.length === 0) {
      i--;
    } else if (res.length > 1) {
      i += res.length - 1;
    }
  } else if (res != null) {
    // $FlowFixMe
    subNode[i] = res;
  }

  return i;
}

function mergeVisitors(a, b) {
  let res = {}; // $FlowFixMe

  res._exploded = true;

  for (let visitor of [a, b]) {
    let {
      shouldSkip,
      ...exploded
    } = (0, _explode.default)(visitor);

    for (let type in exploded) {
      if (!res[type]) {
        res[type] = {};
      }

      if (exploded[type].enter) {
        res[type].enter = [...(res[type].enter || []), ...exploded[type].enter];
      }

      if (exploded[type].exit) {
        res[type].exit = [...(res[type].exit || []), ...exploded[type].exit];
      }
    }

    if (shouldSkip) {
      if (res.shouldSkip) {
        let prev = res.shouldSkip;

        res.shouldSkip = node => prev(node) || shouldSkip(node);
      } else {
        res.shouldSkip = shouldSkip;
      }
    }
  }

  return res;
}