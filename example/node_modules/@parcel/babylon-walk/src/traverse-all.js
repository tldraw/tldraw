// @flow
import type {Node} from '@babel/types';

import * as t from '@babel/types';

export function traverseAll(node: Node, visitor: (node: Node) => void): void {
  if (!node) {
    return;
  }

  visitor(node);

  for (let key of t.VISITOR_KEYS[node.type] || []) {
    // $FlowFixMe
    let subNode: Node | Array<Node> = node[key];
    if (Array.isArray(subNode)) {
      for (let i = 0; i < subNode.length; i++) {
        traverseAll(subNode[i], visitor);
      }
    } else {
      traverseAll(subNode, visitor);
    }
  }
}
