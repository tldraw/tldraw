// @flow strict-local
import type {ContentKey, NodeId} from './types';

import Graph, {type GraphOpts} from './Graph';
import nullthrows from 'nullthrows';

export type SerializedContentGraph<TNode, TEdgeType: string | null = null> = {|
  ...GraphOpts<TNode, TEdgeType>,
  _contentKeyToNodeId: Map<ContentKey, NodeId>,
  _nodeIdToContentKey: Map<NodeId, ContentKey>,
|};

export default class ContentGraph<
  TNode,
  TEdgeType: string | null = null,
> extends Graph<TNode, TEdgeType> {
  _contentKeyToNodeId: Map<ContentKey, NodeId>;
  _nodeIdToContentKey: Map<NodeId, ContentKey>;

  constructor(opts: ?SerializedContentGraph<TNode, TEdgeType>) {
    if (opts) {
      let {_contentKeyToNodeId, _nodeIdToContentKey, ...rest} = opts;
      super(rest);
      this._contentKeyToNodeId = _contentKeyToNodeId;
      this._nodeIdToContentKey = _nodeIdToContentKey;
    } else {
      super();
      this._contentKeyToNodeId = new Map();
      this._nodeIdToContentKey = new Map();
    }
  }

  // $FlowFixMe[prop-missing]
  static deserialize(
    opts: SerializedContentGraph<TNode, TEdgeType>,
  ): ContentGraph<TNode, TEdgeType> {
    return new ContentGraph(opts);
  }

  // $FlowFixMe[prop-missing]
  serialize(): SerializedContentGraph<TNode, TEdgeType> {
    return {
      ...super.serialize(),
      _contentKeyToNodeId: this._contentKeyToNodeId,
      _nodeIdToContentKey: this._nodeIdToContentKey,
    };
  }

  addNodeByContentKey(contentKey: ContentKey, node: TNode): NodeId {
    if (this.hasContentKey(contentKey)) {
      throw new Error('Graph already has content key ' + contentKey);
    }

    let nodeId = super.addNode(node);
    this._contentKeyToNodeId.set(contentKey, nodeId);
    this._nodeIdToContentKey.set(nodeId, contentKey);
    return nodeId;
  }

  getNodeByContentKey(contentKey: ContentKey): ?TNode {
    let nodeId = this._contentKeyToNodeId.get(contentKey);
    if (nodeId != null) {
      return super.getNode(nodeId);
    }
  }

  getNodeIdByContentKey(contentKey: ContentKey): NodeId {
    return nullthrows(
      this._contentKeyToNodeId.get(contentKey),
      `Expected content key ${contentKey} to exist`,
    );
  }

  hasContentKey(contentKey: ContentKey): boolean {
    return this._contentKeyToNodeId.has(contentKey);
  }

  removeNode(nodeId: NodeId): void {
    this._assertHasNodeId(nodeId);
    let contentKey = nullthrows(this._nodeIdToContentKey.get(nodeId));
    this._contentKeyToNodeId.delete(contentKey);
    this._nodeIdToContentKey.delete(nodeId);
    super.removeNode(nodeId);
  }
}
