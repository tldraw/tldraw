// @flow
// Copied from babel-traverse, but with virtual types handling removed
// https://github.com/babel/babel/blob/07b3dc18a09f2217b38a3a63c8613add6df1b47d/packages/babel-traverse/src/visitors.js
import type {SimpleVisitors, VisitorsExploded} from './index';

// import * as messages from 'babel-messages';
import * as t from '@babel/types';
import clone from 'lodash.clone';

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
export default function explode<T>(
  visitor: SimpleVisitors<T>,
): VisitorsExploded<T> {
  // $FlowFixMe
  if (visitor._exploded) return visitor;
  // $FlowFixMe
  visitor._exploded = true;

  // normalise pipes
  for (let nodeType in visitor) {
    if (shouldIgnoreKey(nodeType)) continue;

    let parts = nodeType.split('|');
    if (parts.length === 1) continue;

    let fns = visitor[nodeType];
    delete visitor[nodeType];

    for (let part of parts) {
      visitor[part] = fns;
    }
  }

  // verify data structure
  verify(visitor);

  // make sure there's no __esModule type since this is because we're using loose mode
  // and it sets __esModule to be enumerable on all modules :(
  delete visitor.__esModule;

  // ensure visitors are objects
  ensureEntranceObjects(visitor);

  // ensure enter/exit callbacks are arrays
  ensureCallbackArrays(visitor);

  // add aliases
  for (let nodeType in visitor) {
    if (shouldIgnoreKey(nodeType)) continue;

    let fns = visitor[nodeType];

    let aliases = t.FLIPPED_ALIAS_KEYS[nodeType];

    let deprecratedKey = t.DEPRECATED_KEYS[nodeType];
    if (deprecratedKey) {
      throw new Error(
        `Visitor defined for ${nodeType} but it has been renamed to ${deprecratedKey}`,
      );
    }

    if (!aliases) continue;

    // clear it from the visitor
    delete visitor[nodeType];

    for (let alias of aliases) {
      let existing = visitor[alias];
      if (existing) {
        mergePair(existing, fns);
      } else {
        visitor[alias] = clone(fns);
      }
    }
  }

  for (let nodeType in visitor) {
    if (shouldIgnoreKey(nodeType)) continue;

    ensureCallbackArrays(visitor[nodeType]);
  }

  // $FlowFixMe
  return visitor;
}

export function verify(visitor: any) {
  if (visitor._verified) return;

  if (typeof visitor === 'function') {
    // throw new Error(messages.get("traverseVerifyRootFunction"));
    throw new Error(
      "You passed `traverse()` a function when it expected a visitor object, are you sure you didn't mean `{ enter: Function }`?",
    );
  }

  for (let nodeType in visitor) {
    if (nodeType === 'enter' || nodeType === 'exit') {
      validateVisitorMethods(nodeType, visitor[nodeType]);
    }

    if (shouldIgnoreKey(nodeType)) continue;

    if (t.TYPES.indexOf(nodeType) < 0) {
      // throw new Error(messages.get("traverseVerifyNodeType", nodeType));
      throw new Error(
        `You gave us a visitor for the node type ${nodeType} but it's not a valid type`,
      );
    }

    let visitors = visitor[nodeType];
    if (typeof visitors === 'object') {
      for (let visitorKey in visitors) {
        if (visitorKey === 'enter' || visitorKey === 'exit') {
          // verify that it just contains functions
          validateVisitorMethods(
            `${nodeType}.${visitorKey}`,
            visitors[visitorKey],
          );
        } else {
          // throw new Error(messages.get("traverseVerifyVisitorProperty", nodeType, visitorKey));
          throw new Error(
            `You passed \`traverse()\` a visitor object with the property ${nodeType} that has the invalid property ${visitorKey}`,
          );
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
      throw new TypeError(
        `Non-function found defined in ${path} with type ${typeof fn}`,
      );
    }
  }
}

function ensureEntranceObjects(obj: any) {
  for (let key in obj) {
    if (shouldIgnoreKey(key)) continue;

    let fns = obj[key];
    if (typeof fns === 'function') {
      obj[key] = {enter: fns};
    }
  }
}

function ensureCallbackArrays(obj: any) {
  if (obj.enter && !Array.isArray(obj.enter)) obj.enter = [obj.enter];
  if (obj.exit && !Array.isArray(obj.exit)) obj.exit = [obj.exit];
}

function shouldIgnoreKey(key) {
  // internal/hidden key
  if (key[0] === '_') return true;

  // ignore function keys
  if (key === 'enter' || key === 'exit' || key === 'shouldSkip') return true;

  // ignore other options
  if (key === 'blacklist' || key === 'noScope' || key === 'skipKeys')
    return true;

  return false;
}

function mergePair(dest: any, src: any) {
  for (let key in src) {
    dest[key] = [].concat(dest[key] || [], src[key]);
  }
}
