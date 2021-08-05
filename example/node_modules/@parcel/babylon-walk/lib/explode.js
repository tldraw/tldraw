"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = explode;
exports.verify = verify;

function t() {
  const data = _interopRequireWildcard(require("@babel/types"));

  t = function () {
    return data;
  };

  return data;
}

var _lodash = _interopRequireDefault(require("lodash.clone"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

// Copied from babel-traverse, but with virtual types handling removed
// https://github.com/babel/babel/blob/07b3dc18a09f2217b38a3a63c8613add6df1b47d/packages/babel-traverse/src/visitors.js
// import * as messages from 'babel-messages';

/**
 * explode() will take a visitor object with all of the various shorthands
 * that we support, and validates & normalizes it into a common format, ready
 * to be used in traversal
 *
 * The various shorthands are:
 * * `Identifier() { ... }` -> `Identifier: { enter() { ... } }`
 * * `"Identifier|NumericLiteral": { ... }` -> `Identifier: { ... }, NumericLiteral: { ... }`
 * * Aliases in `babel-types`: e.g. `Property: { ... }` -> `ObjectProperty: { ... }, ClassProperty: { ... }`
 *
 * Other normalizations are:
 * * `enter` and `exit` functions are wrapped in arrays, to ease merging of
 *   visitors
 */
function explode(visitor) {
  // $FlowFixMe
  if (visitor._exploded) return visitor; // $FlowFixMe

  visitor._exploded = true; // normalise pipes

  for (let nodeType in visitor) {
    if (shouldIgnoreKey(nodeType)) continue;
    let parts = nodeType.split('|');
    if (parts.length === 1) continue;
    let fns = visitor[nodeType];
    delete visitor[nodeType];

    for (let part of parts) {
      visitor[part] = fns;
    }
  } // verify data structure


  verify(visitor); // make sure there's no __esModule type since this is because we're using loose mode
  // and it sets __esModule to be enumerable on all modules :(

  delete visitor.__esModule; // ensure visitors are objects

  ensureEntranceObjects(visitor); // ensure enter/exit callbacks are arrays

  ensureCallbackArrays(visitor); // add aliases

  for (let nodeType in visitor) {
    if (shouldIgnoreKey(nodeType)) continue;
    let fns = visitor[nodeType];
    let aliases = t().FLIPPED_ALIAS_KEYS[nodeType];
    let deprecratedKey = t().DEPRECATED_KEYS[nodeType];

    if (deprecratedKey) {
      throw new Error(`Visitor defined for ${nodeType} but it has been renamed to ${deprecratedKey}`);
    }

    if (!aliases) continue; // clear it from the visitor

    delete visitor[nodeType];

    for (let alias of aliases) {
      let existing = visitor[alias];

      if (existing) {
        mergePair(existing, fns);
      } else {
        visitor[alias] = (0, _lodash.default)(fns);
      }
    }
  }

  for (let nodeType in visitor) {
    if (shouldIgnoreKey(nodeType)) continue;
    ensureCallbackArrays(visitor[nodeType]);
  } // $FlowFixMe


  return visitor;
}

function verify(visitor) {
  if (visitor._verified) return;

  if (typeof visitor === 'function') {
    // throw new Error(messages.get("traverseVerifyRootFunction"));
    throw new Error("You passed `traverse()` a function when it expected a visitor object, are you sure you didn't mean `{ enter: Function }`?");
  }

  for (let nodeType in visitor) {
    if (nodeType === 'enter' || nodeType === 'exit') {
      validateVisitorMethods(nodeType, visitor[nodeType]);
    }

    if (shouldIgnoreKey(nodeType)) continue;

    if (t().TYPES.indexOf(nodeType) < 0) {
      // throw new Error(messages.get("traverseVerifyNodeType", nodeType));
      throw new Error(`You gave us a visitor for the node type ${nodeType} but it's not a valid type`);
    }

    let visitors = visitor[nodeType];

    if (typeof visitors === 'object') {
      for (let visitorKey in visitors) {
        if (visitorKey === 'enter' || visitorKey === 'exit') {
          // verify that it just contains functions
          validateVisitorMethods(`${nodeType}.${visitorKey}`, visitors[visitorKey]);
        } else {
          // throw new Error(messages.get("traverseVerifyVisitorProperty", nodeType, visitorKey));
          throw new Error(`You passed \`traverse()\` a visitor object with the property ${nodeType} that has the invalid property ${visitorKey}`);
        }
      }
    }
  }

  visitor._verified = true;
}

function validateVisitorMethods(path, val) {
  let fns = [].concat(val);

  for (let fn of fns) {
    if (typeof fn !== 'function') {
      throw new TypeError(`Non-function found defined in ${path} with type ${typeof fn}`);
    }
  }
}

function ensureEntranceObjects(obj) {
  for (let key in obj) {
    if (shouldIgnoreKey(key)) continue;
    let fns = obj[key];

    if (typeof fns === 'function') {
      obj[key] = {
        enter: fns
      };
    }
  }
}

function ensureCallbackArrays(obj) {
  if (obj.enter && !Array.isArray(obj.enter)) obj.enter = [obj.enter];
  if (obj.exit && !Array.isArray(obj.exit)) obj.exit = [obj.exit];
}

function shouldIgnoreKey(key) {
  // internal/hidden key
  if (key[0] === '_') return true; // ignore function keys

  if (key === 'enter' || key === 'exit' || key === 'shouldSkip') return true; // ignore other options

  if (key === 'blacklist' || key === 'noScope' || key === 'skipKeys') return true;
  return false;
}

function mergePair(dest, src) {
  for (let key in src) {
    dest[key] = [].concat(dest[key] || [], src[key]);
  }
}