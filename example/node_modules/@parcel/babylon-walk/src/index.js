// @flow
import type {Node} from '@babel/types';
import type {SimpleVisitors, VisitorsExploded} from './types';

import * as t from '@babel/types';
import explode from './explode.js';
import traverse from './traverse';

export * from './traverse2';
export * from './traverse-all';
export * from './scope';
export * from './types';

export function simple<T>(
  node: Node,
  _visitors: SimpleVisitors<(any, T) => void>,
  state: T,
) {
  if (!node) return;

  const visitors: VisitorsExploded<(any, T) => void> = explode(_visitors);

  (function c(node) {
    if (!node) return;

    const {enter, exit} = visitors[node.type] || {};

    if (enter) {
      for (let visitor of enter) {
        visitor(node, state);
      }
    }

    for (let key of t.VISITOR_KEYS[node.type] || []) {
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

export function ancestor<T>(
  node: Node,
  _visitors: SimpleVisitors<(any, T, Array<Node>) => void>,
  state: T,
) {
  if (!node) return;

  const visitors = explode<(any, T, Array<Node>) => void>(_visitors);
  let ancestors = [];

  (function c(node) {
    if (!node) return;

    const {enter, exit} = visitors[node.type] || {};

    let isNew = node != ancestors[ancestors.length - 1];
    if (isNew) ancestors.push(node);

    if (enter) {
      for (let visitor of enter) {
        // $FlowFixMe
        visitor(node, state || ancestors, ancestors);
      }
    }

    for (let key of t.VISITOR_KEYS[node.type] || []) {
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

export function recursive<T>(
  node: Node,
  _visitors: SimpleVisitors<(any, T, recurse: (Node) => void) => void>,
  state: T,
) {
  if (!node) return;

  const visitors = explode<(any, T, recurse: (Node) => void) => void>(
    _visitors,
  );

  (function c(node) {
    if (!node) return;

    const {enter} = visitors[node.type] || {};

    if (enter && enter.length) {
      for (let visitor of enter) {
        visitor(node, state, c);
      }
    } else {
      for (let key of t.VISITOR_KEYS[node.type] || []) {
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

export {traverse};
