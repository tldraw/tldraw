// @flow
import type {Node} from '@babel/types';
import type {SimpleVisitors, VisitorsExploded} from './index';

import * as t from '@babel/types';
import invariant from 'assert';
import explode from './explode.js';

class Path {
  node: Node;
  parent: Node;
  listkey: ?string;
  key: number | string;
  _skipped: boolean = false;
  _removed: boolean = false;

  constructor(
    node: Node,
    parent: Node,
    listkey: ?string,
    key: number | string,
  ) {
    this.node = node;
    this.parent = parent;
    this.listkey = listkey;
    this.key = key;
  }
  replaceWith(n: Node) {
    this.node = n;

    // $FlowFixMe
    let p = this.listkey ? this.parent[this.listkey] : this.parent;
    // $FlowFixMe
    p[this.key] = this.node;
  }
  skip() {
    this._skipped = true;
  }
  remove() {
    this._removed = true;
    invariant(this.listkey && typeof this.key === 'number');
    // $FlowFixMe
    this.parent[this.listkey].splice(this.key, 1);
  }
}

export default function traverse<T>(
  node: Node,
  visitors: SimpleVisitors<(Path, T) => void>,
  state: T,
) {
  traverseWalk(explode(visitors), state, node, null, null, null);
}

function traverseWalk<T>(
  visitors: VisitorsExploded<(Path, T) => void>,
  state: T,
  node: Node,
  parent: ?Node,
  listkey,
  key,
) {
  if (!node || (visitors.shouldSkip && visitors.shouldSkip(node) === true)) {
    return;
  }

  const {enter, exit} = visitors[node.type] || {};

  // $FlowFixMe
  const path = new Path(node, parent, listkey, key);

  if (enter) {
    for (let visitor of enter) {
      visitor(path, state);
      if (path._skipped || path._removed) return path._removed;
    }
  }

  for (let key of t.VISITOR_KEYS[node.type] || []) {
    // $FlowFixMe
    let subNode: Node | Array<Node> = node[key];
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
