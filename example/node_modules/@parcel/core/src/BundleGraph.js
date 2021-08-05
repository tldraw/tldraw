// @flow strict-local

import type {
  GraphVisitor,
  FilePath,
  Symbol,
  TraversalActions,
} from '@parcel/types';
import querystring from 'querystring';

import type {
  Asset,
  AssetNode,
  Bundle,
  BundleGraphNode,
  BundleGroup,
  Dependency,
  DependencyNode,
  NodeId,
  InternalSourceLocation,
  Target,
} from './types';
import type AssetGraph from './AssetGraph';
import type {ProjectPath} from './projectPath';

import assert from 'assert';
import invariant from 'assert';
import nullthrows from 'nullthrows';
import {objectSortedEntriesDeep, getRootDir} from '@parcel/utils';
import {Hash, hashString} from '@parcel/hash';
import {Priority, BundleBehavior} from './types';

import {getBundleGroupId, getPublicId} from './utils';
import {ALL_EDGE_TYPES, mapVisitor} from './Graph';
import ContentGraph, {type SerializedContentGraph} from './ContentGraph';
import {ISOLATED_ENVS} from './public/Environment';
import {fromProjectPath} from './projectPath';

type BundleGraphEdgeTypes =
  // A lack of an edge type indicates to follow the edge while traversing
  // the bundle's contents, e.g. `bundle.traverse()` during packaging.
  | null
  // Used for constant-time checks of presence of a dependency or asset in a bundle,
  // avoiding bundle traversal in cases like `isAssetInAncestors`
  | 'contains'
  // Connections between bundles and bundle groups, for quick traversal of the
  // bundle hierarchy.
  | 'bundle'
  // When dependency -> asset: Indicates that the asset a dependency references
  //                           is contained in another bundle.
  // When dependency -> bundle: Indicates the bundle is necessary for any bundles
  //                           with the dependency.
  // When bundle -> bundle:    Indicates the target bundle is necessary for the
  //                           source bundle.
  // This type prevents referenced assets from being traversed from dependencies
  // along the untyped edge, and enables traversal to referenced bundles that are
  // not directly connected to bundle group nodes.
  | 'references'
  // Signals that the dependency is internally resolvable via the bundle's ancestry,
  // and that the bundle connected to the dependency is not necessary for the source bundle.
  | 'internal_async';

type InternalSymbolResolution = {|
  asset: Asset,
  exportSymbol: string,
  symbol: ?Symbol | false,
  loc: ?InternalSourceLocation,
|};

type InternalExportSymbolResolution = {|
  ...InternalSymbolResolution,
  +exportAs: Symbol | string,
|};

type SerializedBundleGraph = {|
  $$raw: true,
  graph: SerializedContentGraph<BundleGraphNode, BundleGraphEdgeTypes>,
  bundleContentHashes: Map<string, string>,
  assetPublicIds: Set<string>,
  publicIdByAssetId: Map<string, string>,
|};

function makeReadOnlySet<T>(set: Set<T>): $ReadOnlySet<T> {
  return new Proxy(set, {
    get(target, property) {
      if (property === 'delete' || property === 'add' || property === 'clear') {
        return undefined;
      } else {
        // $FlowFixMe[incompatible-type]
        let value = target[property];
        return typeof value === 'function' ? value.bind(target) : value;
      }
    },
  });
}

export default class BundleGraph {
  _assetPublicIds: Set<string>;
  _publicIdByAssetId: Map<string, string>;
  // TODO: These hashes are being invalidated in mutative methods, but this._graph is not a private
  // property so it is possible to reach in and mutate the graph without invalidating these hashes.
  // It needs to be exposed in BundlerRunner for now based on how applying runtimes works and the
  // BundlerRunner takes care of invalidating hashes when runtimes are applied, but this is not ideal.
  _bundleContentHashes: Map<string, string>;
  _targetEntryRoots: Map<ProjectPath, FilePath> = new Map();
  _graph: ContentGraph<BundleGraphNode, BundleGraphEdgeTypes>;

  constructor({
    graph,
    publicIdByAssetId,
    assetPublicIds,
    bundleContentHashes,
  }: {|
    graph: ContentGraph<BundleGraphNode, BundleGraphEdgeTypes>,
    publicIdByAssetId: Map<string, string>,
    assetPublicIds: Set<string>,
    bundleContentHashes: Map<string, string>,
  |}) {
    this._graph = graph;
    this._assetPublicIds = assetPublicIds;
    this._publicIdByAssetId = publicIdByAssetId;
    this._bundleContentHashes = bundleContentHashes;
  }

  static fromAssetGraph(
    assetGraph: AssetGraph,
    publicIdByAssetId: Map<string, string> = new Map(),
    assetPublicIds: Set<string> = new Set(),
  ): BundleGraph {
    let graph = new ContentGraph<BundleGraphNode, BundleGraphEdgeTypes>();
    let assetGroupIds = new Set();
    let assetGraphNodeIdToBundleGraphNodeId = new Map<NodeId, NodeId>();

    let assetGraphRootNode =
      assetGraph.rootNodeId != null
        ? assetGraph.getNode(assetGraph.rootNodeId)
        : null;
    invariant(assetGraphRootNode != null && assetGraphRootNode.type === 'root');

    for (let [nodeId, node] of assetGraph.nodes) {
      if (node.type === 'asset') {
        let {id: assetId} = node.value;
        // Generate a new, short public id for this asset to use.
        // If one already exists, use it.
        let publicId = publicIdByAssetId.get(assetId);
        if (publicId == null) {
          publicId = getPublicId(assetId, existing =>
            assetPublicIds.has(existing),
          );
          publicIdByAssetId.set(assetId, publicId);
          assetPublicIds.add(publicId);
        }
      }

      // Don't copy over asset groups into the bundle graph.
      if (node.type === 'asset_group') {
        assetGroupIds.add(nodeId);
      } else {
        let bundleGraphNodeId = graph.addNodeByContentKey(node.id, node);
        if (node.id === assetGraphRootNode?.id) {
          graph.setRootNodeId(bundleGraphNodeId);
        }
        assetGraphNodeIdToBundleGraphNodeId.set(nodeId, bundleGraphNodeId);
      }
    }

    for (let edge of assetGraph.getAllEdges()) {
      let fromIds;
      if (assetGroupIds.has(edge.from)) {
        fromIds = [...assetGraph.inboundEdges.getEdges(edge.from, null)];
      } else {
        fromIds = [edge.from];
      }

      for (let from of fromIds) {
        if (assetGroupIds.has(edge.to)) {
          for (let to of assetGraph.outboundEdges.getEdges(edge.to, null)) {
            graph.addEdge(
              nullthrows(assetGraphNodeIdToBundleGraphNodeId.get(from)),
              nullthrows(assetGraphNodeIdToBundleGraphNodeId.get(to)),
            );
          }
        } else {
          graph.addEdge(
            nullthrows(assetGraphNodeIdToBundleGraphNodeId.get(from)),
            nullthrows(assetGraphNodeIdToBundleGraphNodeId.get(edge.to)),
          );
        }
      }
    }

    return new BundleGraph({
      graph,
      assetPublicIds,
      bundleContentHashes: new Map(),
      publicIdByAssetId,
    });
  }

  serialize(): SerializedBundleGraph {
    return {
      $$raw: true,
      graph: this._graph.serialize(),
      assetPublicIds: this._assetPublicIds,
      bundleContentHashes: this._bundleContentHashes,
      publicIdByAssetId: this._publicIdByAssetId,
    };
  }

  static deserialize(serialized: SerializedBundleGraph): BundleGraph {
    return new BundleGraph({
      graph: ContentGraph.deserialize(serialized.graph),
      assetPublicIds: serialized.assetPublicIds,
      bundleContentHashes: serialized.bundleContentHashes,
      publicIdByAssetId: serialized.publicIdByAssetId,
    });
  }

  addAssetGraphToBundle(
    asset: Asset,
    bundle: Bundle,
    shouldSkipDependency: Dependency => boolean = d =>
      this.isDependencySkipped(d),
  ) {
    let assetNodeId = this._graph.getNodeIdByContentKey(asset.id);
    let bundleNodeId = this._graph.getNodeIdByContentKey(bundle.id);

    // The root asset should be reached directly from the bundle in traversal.
    // Its children will be traversed from there.
    this._graph.addEdge(bundleNodeId, assetNodeId);
    this._graph.traverse((nodeId, _, actions) => {
      let node = nullthrows(this._graph.getNode(nodeId));
      if (node.type === 'bundle_group') {
        actions.skipChildren();
        return;
      }

      if (node.type === 'dependency' && shouldSkipDependency(node.value)) {
        actions.skipChildren();
        return;
      }

      if (node.type === 'asset' || node.type === 'dependency') {
        this._graph.addEdge(bundleNodeId, nodeId, 'contains');
      }

      if (node.type === 'dependency') {
        for (let [bundleGroupNodeId, bundleGroupNode] of this._graph
          .getNodeIdsConnectedFrom(nodeId)
          .map(id => [id, nullthrows(this._graph.getNode(id))])
          .filter(([, node]) => node.type === 'bundle_group')) {
          invariant(bundleGroupNode.type === 'bundle_group');
          this._graph.addEdge(bundleNodeId, bundleGroupNodeId, 'bundle');
        }

        // If the dependency references a target bundle, add a reference edge from
        // the source bundle to the dependency for easy traversal.
        if (
          this._graph
            .getNodeIdsConnectedFrom(nodeId, 'references')
            .map(id => nullthrows(this._graph.getNode(id)))
            .some(node => node.type === 'bundle')
        ) {
          this._graph.addEdge(bundleNodeId, nodeId, 'references');
        }
      }
    }, assetNodeId);
    this._bundleContentHashes.delete(bundle.id);
  }

  addEntryToBundle(
    asset: Asset,
    bundle: Bundle,
    shouldSkipDependency?: Dependency => boolean,
  ) {
    this.addAssetGraphToBundle(asset, bundle, shouldSkipDependency);
    if (!bundle.entryAssetIds.includes(asset.id)) {
      bundle.entryAssetIds.push(asset.id);
    }
  }

  internalizeAsyncDependency(bundle: Bundle, dependency: Dependency) {
    if (dependency.priority === Priority.sync) {
      throw new Error('Expected an async dependency');
    }

    this._graph.addEdge(
      this._graph.getNodeIdByContentKey(bundle.id),
      this._graph.getNodeIdByContentKey(dependency.id),
      'internal_async',
    );
    this.removeExternalDependency(bundle, dependency);
  }

  isDependencySkipped(dependency: Dependency): boolean {
    let node = this._graph.getNodeByContentKey(dependency.id);
    invariant(node && node.type === 'dependency');
    return !!node.hasDeferred || node.excluded;
  }

  getParentBundlesOfBundleGroup(bundleGroup: BundleGroup): Array<Bundle> {
    return this._graph
      .getNodeIdsConnectedTo(
        this._graph.getNodeIdByContentKey(getBundleGroupId(bundleGroup)),
        'bundle',
      )
      .map(id => nullthrows(this._graph.getNode(id)))
      .filter(node => node.type === 'bundle')
      .map(node => {
        invariant(node.type === 'bundle');
        return node.value;
      });
  }

  resolveAsyncDependency(
    dependency: Dependency,
    bundle: ?Bundle,
  ): ?(
    | {|type: 'bundle_group', value: BundleGroup|}
    | {|type: 'asset', value: Asset|}
  ) {
    let depNodeId = this._graph.getNodeIdByContentKey(dependency.id);
    let bundleNodeId =
      bundle != null ? this._graph.getNodeIdByContentKey(bundle.id) : null;

    if (
      bundleNodeId != null &&
      this._graph.hasEdge(bundleNodeId, depNodeId, 'internal_async')
    ) {
      let referencedAssetNodeIds = this._graph.getNodeIdsConnectedFrom(
        depNodeId,
        'references',
      );

      let resolved;
      if (referencedAssetNodeIds.length === 0) {
        resolved = this.getResolvedAsset(dependency, bundle);
      } else if (referencedAssetNodeIds.length === 1) {
        let referencedAssetNode = this._graph.getNode(
          referencedAssetNodeIds[0],
        );
        // If a referenced asset already exists, resolve this dependency to it.
        invariant(referencedAssetNode?.type === 'asset');
        resolved = referencedAssetNode.value;
      } else {
        throw new Error('Dependencies can only reference one asset');
      }

      if (resolved == null) {
        return;
      } else {
        return {
          type: 'asset',
          value: resolved,
        };
      }
    }

    let node = this._graph
      .getNodeIdsConnectedFrom(this._graph.getNodeIdByContentKey(dependency.id))
      .map(id => nullthrows(this._graph.getNode(id)))
      .find(node => node.type === 'bundle_group');

    if (node == null) {
      return;
    }

    invariant(node.type === 'bundle_group');
    return {
      type: 'bundle_group',
      value: node.value,
    };
  }

  getReferencedBundle(dependency: Dependency, fromBundle: Bundle): ?Bundle {
    let dependencyNodeId = this._graph.getNodeIdByContentKey(dependency.id);

    // If this dependency is async, there will be a bundle group attached to it.
    let node = this._graph
      .getNodeIdsConnectedFrom(dependencyNodeId)
      .map(id => nullthrows(this._graph.getNode(id)))
      .find(node => node.type === 'bundle_group');

    if (node != null) {
      invariant(node.type === 'bundle_group');
      return this.getBundlesInBundleGroup(node.value, {
        includeInline: true,
      }).find(b => {
        let mainEntryId = b.entryAssetIds[b.entryAssetIds.length - 1];
        return mainEntryId != null && node.value.entryAssetId === mainEntryId;
      });
    }

    // Otherwise, it may be a reference to another asset in the same bundle group.
    // Resolve the dependency to an asset, and look for it in one of the referenced bundles.
    let referencedBundles = this.getReferencedBundles(fromBundle, {
      includeInline: true,
    });
    let referenced = this._graph
      .getNodeIdsConnectedFrom(dependencyNodeId, 'references')
      .map(id => nullthrows(this._graph.getNode(id)))
      .find(node => node.type === 'asset');

    if (referenced != null) {
      invariant(referenced.type === 'asset');
      return referencedBundles.find(b =>
        this.bundleHasAsset(b, referenced.value),
      );
    }
  }

  removeAssetGraphFromBundle(asset: Asset, bundle: Bundle) {
    let bundleNodeId = this._graph.getNodeIdByContentKey(bundle.id);
    let assetNodeId = this._graph.getNodeIdByContentKey(asset.id);

    // Remove all contains edges from the bundle to the nodes in the asset's
    // subgraph.
    this._graph.traverse((nodeId, context, actions) => {
      let node = nullthrows(this._graph.getNode(nodeId));

      if (node.type === 'bundle_group') {
        actions.skipChildren();
        return;
      }

      if (node.type !== 'dependency' && node.type !== 'asset') {
        return;
      }

      if (this._graph.hasEdge(bundleNodeId, nodeId, 'contains')) {
        this._graph.removeEdge(
          bundleNodeId,
          nodeId,
          'contains',
          // Removing this contains edge should not orphan the connected node. This
          // is disabled for performance reasons as these edges are removed as part
          // of a traversal, and checking for orphans becomes quite expensive in
          // aggregate.
          false /* removeOrphans */,
        );
      } else {
        actions.skipChildren();
      }

      if (node.type === 'asset' && this._graph.hasEdge(bundleNodeId, nodeId)) {
        // Remove the untyped edge from the bundle to the node (it's an entry)
        this._graph.removeEdge(bundleNodeId, nodeId);

        let entryIndex = bundle.entryAssetIds.indexOf(node.value.id);
        if (entryIndex >= 0) {
          // Shared bundles have untyped edges to their asset graphs but don't
          // have entry assets. For those that have entry asset ids, remove them.
          bundle.entryAssetIds.splice(entryIndex, 1);
        }
      }

      if (node.type === 'dependency') {
        this.removeExternalDependency(bundle, node.value);
        if (this._graph.hasEdge(bundleNodeId, nodeId, 'references')) {
          this._graph.addEdge(bundleNodeId, nodeId, 'references');
        }
        if (this._graph.hasEdge(bundleNodeId, nodeId, 'internal_async')) {
          this._graph.removeEdge(bundleNodeId, nodeId, 'internal_async');
        }
      }
    }, assetNodeId);

    // Remove bundle node if it no longer has any entry assets
    if (this._graph.getNodeIdsConnectedFrom(bundleNodeId).length === 0) {
      this.removeBundle(bundle);
    }

    this._bundleContentHashes.delete(bundle.id);
  }

  removeBundle(bundle: Bundle): Set<BundleGroup> {
    // Remove bundle node if it no longer has any entry assets
    let bundleNodeId = this._graph.getNodeIdByContentKey(bundle.id);

    let bundleGroupNodeIds = this._graph.getNodeIdsConnectedTo(
      bundleNodeId,
      'bundle',
    );
    this._graph.removeNode(bundleNodeId);

    let removedBundleGroups: Set<BundleGroup> = new Set();
    // Remove bundle group node if it no longer has any bundles
    for (let bundleGroupNodeId of bundleGroupNodeIds) {
      let bundleGroupNode = nullthrows(this._graph.getNode(bundleGroupNodeId));
      invariant(bundleGroupNode.type === 'bundle_group');
      let bundleGroup = bundleGroupNode.value;

      if (
        // If the bundle group's entry asset belongs to this bundle, the group
        // was created because of this bundle. Remove the group.
        bundle.entryAssetIds.includes(bundleGroup.entryAssetId) ||
        // If the bundle group is now empty, remove it.
        this.getBundlesInBundleGroup(bundleGroup, {includeInline: true})
          .length === 0
      ) {
        removedBundleGroups.add(bundleGroup);
        this.removeBundleGroup(bundleGroup);
      }
    }

    this._bundleContentHashes.delete(bundle.id);
    return removedBundleGroups;
  }

  removeBundleGroup(bundleGroup: BundleGroup) {
    let bundleGroupNode = nullthrows(
      this._graph.getNodeByContentKey(getBundleGroupId(bundleGroup)),
    );
    invariant(bundleGroupNode.type === 'bundle_group');

    let bundlesInGroup = this.getBundlesInBundleGroup(bundleGroupNode.value, {
      includeInline: true,
    });
    for (let bundle of bundlesInGroup) {
      if (this.getBundleGroupsContainingBundle(bundle).length === 1) {
        let removedBundleGroups = this.removeBundle(bundle);
        if (removedBundleGroups.has(bundleGroup)) {
          // This function can be reentered through removeBundle above. In the case this
          // bundle group has already been removed, stop.
          return;
        }
      }
    }

    // This function can be reentered through removeBundle above. In this case,
    // the node may already been removed.
    if (this._graph.hasContentKey(bundleGroupNode.id)) {
      this._graph.removeNode(
        this._graph.getNodeIdByContentKey(bundleGroupNode.id),
      );
    }

    assert(
      bundlesInGroup.every(
        bundle => this.getBundleGroupsContainingBundle(bundle).length > 0,
      ),
    );
  }

  removeExternalDependency(bundle: Bundle, dependency: Dependency) {
    let bundleNodeId = this._graph.getNodeIdByContentKey(bundle.id);
    for (let bundleGroupNode of this._graph
      .getNodeIdsConnectedFrom(this._graph.getNodeIdByContentKey(dependency.id))
      .map(id => nullthrows(this._graph.getNode(id)))
      .filter(node => node.type === 'bundle_group')) {
      let bundleGroupNodeId = this._graph.getNodeIdByContentKey(
        bundleGroupNode.id,
      );

      if (!this._graph.hasEdge(bundleNodeId, bundleGroupNodeId, 'bundle')) {
        continue;
      }

      let inboundDependencies = this._graph
        .getNodeIdsConnectedTo(bundleGroupNodeId)
        .map(id => nullthrows(this._graph.getNode(id)))
        .filter(node => node.type === 'dependency')
        .map(node => {
          invariant(node.type === 'dependency');
          return node.value;
        });

      // If every inbound dependency to this bundle group does not belong to this bundle,
      // or the dependency is internal to the bundle, then the connection between
      // this bundle and the group is safe to remove.
      if (
        inboundDependencies.every(
          dependency =>
            !this.bundleHasDependency(bundle, dependency) ||
            this._graph.hasEdge(
              bundleNodeId,
              this._graph.getNodeIdByContentKey(dependency.id),
              'internal_async',
            ),
        )
      ) {
        this._graph.removeEdge(bundleNodeId, bundleGroupNodeId, 'bundle');
      }
    }
  }

  createAssetReference(
    dependency: Dependency,
    asset: Asset,
    bundle: Bundle,
  ): void {
    let dependencyId = this._graph.getNodeIdByContentKey(dependency.id);
    let assetId = this._graph.getNodeIdByContentKey(asset.id);
    let bundleId = this._graph.getNodeIdByContentKey(bundle.id);
    this._graph.addEdge(dependencyId, assetId, 'references');

    this._graph.addEdge(dependencyId, bundleId, 'references');
    if (this._graph.hasEdge(dependencyId, assetId)) {
      this._graph.removeEdge(dependencyId, assetId);
    }
  }

  createBundleReference(from: Bundle, to: Bundle): void {
    this._graph.addEdge(
      this._graph.getNodeIdByContentKey(from.id),
      this._graph.getNodeIdByContentKey(to.id),
      'references',
    );
  }

  getBundlesWithAsset(asset: Asset): Array<Bundle> {
    return this._graph
      .getNodeIdsConnectedTo(
        this._graph.getNodeIdByContentKey(asset.id),
        'contains',
      )
      .map(id => nullthrows(this._graph.getNode(id)))
      .filter(node => node.type === 'bundle')
      .map(node => {
        invariant(node.type === 'bundle');
        return node.value;
      });
  }

  getBundlesWithDependency(dependency: Dependency): Array<Bundle> {
    return this._graph
      .getNodeIdsConnectedTo(
        nullthrows(this._graph.getNodeIdByContentKey(dependency.id)),
        'contains',
      )
      .map(id => nullthrows(this._graph.getNode(id)))
      .filter(node => node.type === 'bundle')
      .map(node => {
        invariant(node.type === 'bundle');
        return node.value;
      });
  }

  getDependencyAssets(dependency: Dependency): Array<Asset> {
    return this._graph
      .getNodeIdsConnectedFrom(this._graph.getNodeIdByContentKey(dependency.id))
      .map(id => nullthrows(this._graph.getNode(id)))
      .filter(node => node.type === 'asset')
      .map(node => {
        invariant(node.type === 'asset');
        return node.value;
      });
  }

  getResolvedAsset(dep: Dependency, bundle: ?Bundle): ?Asset {
    let assets = this.getDependencyAssets(dep);
    let firstAsset = assets[0];
    let resolved =
      // If no bundle is specified, use the first concrete asset.
      bundle == null
        ? firstAsset
        : // Otherwise, find the first asset that belongs to this bundle.
          assets.find(asset => this.bundleHasAsset(bundle, asset)) ||
          firstAsset;

    // If a resolution still hasn't been found, return the first referenced asset.
    if (resolved == null) {
      this._graph.traverse(
        (nodeId, _, traversal) => {
          let node = nullthrows(this._graph.getNode(nodeId));
          if (node.type === 'asset') {
            resolved = node.value;
            traversal.stop();
          } else if (node.id !== dep.id) {
            traversal.skipChildren();
          }
        },
        this._graph.getNodeIdByContentKey(dep.id),
        'references',
      );
    }

    return resolved;
  }

  getDependencies(asset: Asset): Array<Dependency> {
    let nodeId = this._graph.getNodeIdByContentKey(asset.id);
    return this._graph.getNodeIdsConnectedFrom(nodeId).map(id => {
      let node = nullthrows(this._graph.getNode(id));
      invariant(node.type === 'dependency');
      return node.value;
    });
  }

  traverseAssets<TContext>(
    bundle: Bundle,
    visit: GraphVisitor<Asset, TContext>,
  ): ?TContext {
    return this.traverseBundle(
      bundle,
      mapVisitor(node => (node.type === 'asset' ? node.value : null), visit),
    );
  }

  isAssetReferenced(bundle: Bundle, asset: Asset): boolean {
    let assetNodeId = nullthrows(this._graph.getNodeIdByContentKey(asset.id));

    if (
      this._graph
        .getNodeIdsConnectedTo(assetNodeId, 'references')
        .map(id => this._graph.getNode(id))
        .filter(
          node =>
            node?.type === 'dependency' &&
            node.value.priority === Priority.lazy,
        ).length > 0
    ) {
      // If this asset is referenced by any async dependency, it's referenced.
      return true;
    }

    let dependencies = this._graph
      .getNodeIdsConnectedTo(assetNodeId)
      .map(id => nullthrows(this._graph.getNode(id)))
      .filter(node => node.type === 'dependency')
      .map(node => {
        invariant(node.type === 'dependency');
        return node.value;
      });

    const bundleHasReference = (bundle: Bundle) => {
      return (
        !this.bundleHasAsset(bundle, asset) &&
        dependencies.some(dependency =>
          this.bundleHasDependency(bundle, dependency),
        )
      );
    };

    let visitedBundles: Set<Bundle> = new Set();
    let siblingBundles = new Set(
      this.getBundleGroupsContainingBundle(bundle).flatMap(bundleGroup =>
        this.getBundlesInBundleGroup(bundleGroup, {includeInline: true}),
      ),
    );

    // Check if any of this bundle's descendants, referencers, bundles referenced
    // by referencers, or descendants of its referencers use the asset without
    // an explicit reference edge. This can happen if e.g. the asset has been
    // deduplicated.
    return [...siblingBundles].some(referencer => {
      let isReferenced = false;
      this.traverseBundles((descendant, _, actions) => {
        if (descendant.id === bundle.id) {
          return;
        }

        if (visitedBundles.has(descendant)) {
          actions.skipChildren();
          return;
        }

        visitedBundles.add(descendant);

        if (
          descendant.type !== bundle.type ||
          descendant.env.context !== bundle.env.context
        ) {
          actions.skipChildren();
          return;
        }

        if (bundleHasReference(descendant)) {
          isReferenced = true;
          actions.stop();
          return;
        }
      }, referencer);

      return isReferenced;
    });
  }

  hasParentBundleOfType(bundle: Bundle, type: string): boolean {
    let parents = this.getParentBundles(bundle);
    return parents.length > 0 && parents.every(parent => parent.type === type);
  }

  getParentBundles(bundle: Bundle): Array<Bundle> {
    let parentBundles: Set<Bundle> = new Set();
    for (let bundleGroup of this.getBundleGroupsContainingBundle(bundle)) {
      for (let parentBundle of this.getParentBundlesOfBundleGroup(
        bundleGroup,
      )) {
        parentBundles.add(parentBundle);
      }
    }

    return [...parentBundles];
  }

  isAssetReachableFromBundle(asset: Asset, bundle: Bundle): boolean {
    // If a bundle's environment is isolated, it can't access assets present
    // in any ancestor bundles. Don't consider any assets reachable.
    if (
      ISOLATED_ENVS.has(bundle.env.context) ||
      !bundle.isSplittable ||
      bundle.bundleBehavior === BundleBehavior.isolated ||
      bundle.bundleBehavior === BundleBehavior.inline
    ) {
      return false;
    }

    // For an asset to be reachable from a bundle, it must either exist in a sibling bundle,
    // or in an ancestor bundle group reachable from all parent bundles.
    let bundleGroups = this.getBundleGroupsContainingBundle(bundle);
    return bundleGroups.every(bundleGroup => {
      // If the asset is in any sibling bundles of the original bundle, it is reachable.
      let bundles = this.getBundlesInBundleGroup(bundleGroup);
      if (
        bundles.some(
          b =>
            b.id !== bundle.id &&
            b.bundleBehavior !== BundleBehavior.isolated &&
            b.bundleBehavior !== BundleBehavior.inline &&
            this.bundleHasAsset(b, asset),
        )
      ) {
        return true;
      }

      // Get a list of parent bundle nodes pointing to the bundle group
      let parentBundleNodes = this._graph.getNodeIdsConnectedTo(
        this._graph.getNodeIdByContentKey(getBundleGroupId(bundleGroup)),
        'bundle',
      );

      // Check that every parent bundle has a bundle group in its ancestry that contains the asset.
      return parentBundleNodes.every(bundleNodeId => {
        let bundleNode = nullthrows(this._graph.getNode(bundleNodeId));
        if (
          bundleNode.type !== 'bundle' ||
          bundleNode.value.bundleBehavior === BundleBehavior.isolated ||
          bundleNode.value.bundleBehavior === BundleBehavior.inline
        ) {
          return false;
        }

        let isReachable = true;
        this._graph.traverseAncestors(
          bundleNodeId,
          (nodeId, ctx, actions) => {
            let node = nullthrows(this._graph.getNode(nodeId));
            // If we've reached the root or a context change without
            // finding this asset in the ancestry, it is not reachable.
            if (
              node.type === 'root' ||
              (node.type === 'bundle' &&
                (node.value.id === bundle.id ||
                  node.value.env.context !== bundle.env.context))
            ) {
              isReachable = false;
              actions.stop();
              return;
            }

            if (node.type === 'bundle_group') {
              let childBundles = this.getBundlesInBundleGroup(node.value);
              if (
                childBundles.some(
                  b =>
                    b.id !== bundle.id &&
                    b.bundleBehavior !== BundleBehavior.isolated &&
                    b.bundleBehavior !== BundleBehavior.inline &&
                    this.bundleHasAsset(b, asset),
                )
              ) {
                actions.skipChildren();
                return;
              }
            }
          },
          ['references', 'bundle'],
        );

        return isReachable;
      });
    });
  }

  traverseBundle<TContext>(
    bundle: Bundle,
    visit: GraphVisitor<AssetNode | DependencyNode, TContext>,
  ): ?TContext {
    let entries = true;
    let bundleNodeId = this._graph.getNodeIdByContentKey(bundle.id);

    // A modified DFS traversal which traverses entry assets in the same order
    // as their ids appear in `bundle.entryAssetIds`.
    return this._graph.dfs({
      visit: mapVisitor((nodeId, actions) => {
        let node = nullthrows(this._graph.getNode(nodeId));

        if (nodeId === bundleNodeId) {
          return;
        }

        if (node.type === 'dependency' || node.type === 'asset') {
          if (this._graph.hasEdge(bundleNodeId, nodeId, 'contains')) {
            return node;
          }
        }

        actions.skipChildren();
      }, visit),
      startNodeId: bundleNodeId,
      getChildren: nodeId => {
        let children = this._graph
          .getNodeIdsConnectedFrom(nodeId)
          .map(id => [id, nullthrows(this._graph.getNode(id))]);

        let sorted =
          entries && bundle.entryAssetIds.length > 0
            ? children.sort(([, a], [, b]) => {
                let aIndex = bundle.entryAssetIds.indexOf(a.id);
                let bIndex = bundle.entryAssetIds.indexOf(b.id);

                if (aIndex === bIndex) {
                  // If both don't exist in the entry asset list, or
                  // otherwise have the same index.
                  return 0;
                } else if (aIndex === -1) {
                  return 1;
                } else if (bIndex === -1) {
                  return -1;
                }

                return aIndex - bIndex;
              })
            : children;

        entries = false;
        return sorted.map(([id]) => id);
      },
    });
  }

  traverse<TContext>(
    visit: GraphVisitor<AssetNode | DependencyNode, TContext>,
  ): ?TContext {
    return this._graph.filteredTraverse(
      nodeId => {
        let node = nullthrows(this._graph.getNode(nodeId));
        if (node.type === 'asset' || node.type === 'dependency') {
          return node;
        }
      },
      visit,
      undefined, // start with root
      // $FlowFixMe
      ALL_EDGE_TYPES,
    );
  }

  getChildBundles(bundle: Bundle): Array<Bundle> {
    let siblings = new Set(this.getReferencedBundles(bundle));
    let bundles = [];
    this.traverseBundles((b, _, actions) => {
      if (bundle.id === b.id) {
        return;
      }

      if (!siblings.has(b)) {
        bundles.push(b);
      }

      actions.skipChildren();
    }, bundle);
    return bundles;
  }

  traverseBundles<TContext>(
    visit: GraphVisitor<Bundle, TContext>,
    startBundle: ?Bundle,
  ): ?TContext {
    return this._graph.filteredTraverse(
      nodeId => {
        let node = nullthrows(this._graph.getNode(nodeId));
        return node.type === 'bundle' ? node.value : null;
      },
      visit,
      startBundle ? this._graph.getNodeIdByContentKey(startBundle.id) : null,
      ['bundle', 'references'],
    );
  }

  getBundles(opts?: {|includeInline: boolean|}): Array<Bundle> {
    let bundles = [];
    this.traverseBundles(bundle => {
      if (
        opts?.includeInline ||
        bundle.bundleBehavior !== BundleBehavior.inline
      ) {
        bundles.push(bundle);
      }
    });

    return bundles;
  }

  getTotalSize(asset: Asset): number {
    let size = 0;
    this._graph.traverse((nodeId, _, actions) => {
      let node = nullthrows(this._graph.getNode(nodeId));
      if (node.type === 'bundle_group') {
        actions.skipChildren();
        return;
      }

      if (node.type === 'asset') {
        size += node.value.stats.size;
      }
    }, this._graph.getNodeIdByContentKey(asset.id));
    return size;
  }

  getReferencingBundles(bundle: Bundle): Array<Bundle> {
    let referencingBundles: Set<Bundle> = new Set();

    this._graph.traverseAncestors(
      this._graph.getNodeIdByContentKey(bundle.id),
      nodeId => {
        let node = nullthrows(this._graph.getNode(nodeId));
        if (node.type === 'bundle' && node.value.id !== bundle.id) {
          referencingBundles.add(node.value);
        }
      },
      'references',
    );

    return [...referencingBundles];
  }

  getBundleGroupsContainingBundle(bundle: Bundle): Array<BundleGroup> {
    let bundleGroups: Set<BundleGroup> = new Set();

    for (let currentBundle of [bundle, ...this.getReferencingBundles(bundle)]) {
      for (let bundleGroup of this.getDirectParentBundleGroups(currentBundle)) {
        bundleGroups.add(bundleGroup);
      }
    }

    return [...bundleGroups];
  }

  getDirectParentBundleGroups(bundle: Bundle): Array<BundleGroup> {
    return this._graph
      .getNodeIdsConnectedTo(
        nullthrows(this._graph.getNodeIdByContentKey(bundle.id)),
        'bundle',
      )
      .map(id => nullthrows(this._graph.getNode(id)))
      .filter(node => node.type === 'bundle_group')
      .map(node => {
        invariant(node.type === 'bundle_group');
        return node.value;
      });
  }

  getBundlesInBundleGroup(
    bundleGroup: BundleGroup,
    opts?: {|includeInline: boolean|},
  ): Array<Bundle> {
    let bundles: Set<Bundle> = new Set();
    for (let bundleNodeId of this._graph.getNodeIdsConnectedFrom(
      this._graph.getNodeIdByContentKey(getBundleGroupId(bundleGroup)),
      'bundle',
    )) {
      let bundleNode = nullthrows(this._graph.getNode(bundleNodeId));
      invariant(bundleNode.type === 'bundle');
      let bundle = bundleNode.value;
      if (
        opts?.includeInline ||
        bundle.bundleBehavior !== BundleBehavior.inline
      ) {
        bundles.add(bundle);
      }

      for (let referencedBundle of this.getReferencedBundles(bundle, {
        includeInline: true,
      })) {
        bundles.add(referencedBundle);
      }
    }

    return [...bundles];
  }

  getReferencedBundles(
    bundle: Bundle,
    opts?: {|recursive?: boolean, includeInline?: boolean|},
  ): Array<Bundle> {
    let recursive = opts?.recursive ?? true;
    let includeInline = opts?.includeInline ?? false;
    let referencedBundles = new Set();
    this._graph.dfs({
      visit: (nodeId, _, actions) => {
        let node = nullthrows(this._graph.getNode(nodeId));
        if (node.type !== 'bundle') {
          return;
        }

        if (node.value.id === bundle.id) {
          return;
        }

        if (
          includeInline ||
          node.value.bundleBehavior !== BundleBehavior.inline
        ) {
          referencedBundles.add(node.value);
        }

        if (!recursive) {
          actions.skipChildren();
        }
      },
      startNodeId: this._graph.getNodeIdByContentKey(bundle.id),
      getChildren: nodeId =>
        // Shared bundles seem to depend on being used in the opposite order
        // they were added.
        // TODO: Should this be the case?
        this._graph.getNodeIdsConnectedFrom(nodeId, 'references').reverse(),
    });

    return [...referencedBundles];
  }

  getIncomingDependencies(asset: Asset): Array<Dependency> {
    if (!this._graph.hasContentKey(asset.id)) {
      return [];
    }
    // Dependencies can be a a parent node via an untyped edge (like in the AssetGraph but without AssetGroups)
    // or they can be parent nodes via a 'references' edge
    return this._graph
      .getNodeIdsConnectedTo(
        this._graph.getNodeIdByContentKey(asset.id),
        // $FlowFixMe
        ALL_EDGE_TYPES,
      )
      .map(id => nullthrows(this._graph.getNode(id)))
      .filter(n => n.type === 'dependency')
      .map(n => {
        invariant(n.type === 'dependency');
        return n.value;
      });
  }

  getAssetWithDependency(dep: Dependency): ?Asset {
    if (!this._graph.hasContentKey(dep.id)) {
      return null;
    }

    let res = this._graph.getNodeIdsConnectedTo(
      this._graph.getNodeIdByContentKey(dep.id),
    );
    invariant(
      res.length <= 1,
      'Expected a single asset to be connected to a dependency',
    );
    let resNode = this._graph.getNode(res[0]);
    if (resNode?.type === 'asset') {
      return resNode.value;
    }
  }

  bundleHasAsset(bundle: Bundle, asset: Asset): boolean {
    let bundleNodeId = this._graph.getNodeIdByContentKey(bundle.id);
    let assetNodeId = this._graph.getNodeIdByContentKey(asset.id);
    return this._graph.hasEdge(bundleNodeId, assetNodeId, 'contains');
  }

  bundleHasDependency(bundle: Bundle, dependency: Dependency): boolean {
    let bundleNodeId = this._graph.getNodeIdByContentKey(bundle.id);
    let dependencyNodeId = this._graph.getNodeIdByContentKey(dependency.id);
    return this._graph.hasEdge(bundleNodeId, dependencyNodeId, 'contains');
  }

  filteredTraverse<TValue, TContext>(
    bundleNodeId: NodeId,
    filter: (NodeId, TraversalActions) => ?TValue,
    visit: GraphVisitor<TValue, TContext>,
  ): ?TContext {
    return this._graph.filteredTraverse(filter, visit, bundleNodeId);
  }

  getSymbolResolution(
    asset: Asset,
    symbol: Symbol,
    boundary: ?Bundle,
  ): InternalSymbolResolution {
    let assetOutside = boundary && !this.bundleHasAsset(boundary, asset);

    let identifier = asset.symbols?.get(symbol)?.local;
    if (symbol === '*') {
      return {
        asset,
        exportSymbol: '*',
        symbol: identifier ?? null,
        loc: asset.symbols?.get(symbol)?.loc,
      };
    }

    let found = false;
    let skipped = false;
    let deps = this.getDependencies(asset).reverse();
    let potentialResults = [];
    for (let dep of deps) {
      let depSymbols = dep.symbols;
      if (!depSymbols) {
        found = true;
        continue;
      }
      // If this is a re-export, find the original module.
      let symbolLookup = new Map(
        [...depSymbols].map(([key, val]) => [val.local, key]),
      );
      let depSymbol = symbolLookup.get(identifier);
      if (depSymbol != null) {
        let resolved = this.getResolvedAsset(dep);
        if (!resolved || resolved.id === asset.id) {
          // External module or self-reference
          return {
            asset,
            exportSymbol: symbol,
            symbol: identifier,
            loc: asset.symbols?.get(symbol)?.loc,
          };
        }

        if (assetOutside) {
          // We found the symbol, but `asset` is outside, return `asset` and the original symbol
          found = true;
          break;
        }

        if (this.isDependencySkipped(dep)) {
          // We found the symbol and `dep` was skipped
          skipped = true;
          break;
        }

        let {
          asset: resolvedAsset,
          symbol: resolvedSymbol,
          exportSymbol,
          loc,
        } = this.getSymbolResolution(resolved, depSymbol, boundary);

        if (!loc) {
          // Remember how we got there
          loc = asset.symbols?.get(symbol)?.loc;
        }

        return {
          asset: resolvedAsset,
          symbol: resolvedSymbol,
          exportSymbol,
          loc,
        };
      }
      // If this module exports wildcards, resolve the original module.
      // Default exports are excluded from wildcard exports.
      // Wildcard reexports are never listed in the reexporting asset's symbols.
      if (
        identifier == null &&
        depSymbols.get('*')?.local === '*' &&
        symbol !== 'default'
      ) {
        let resolved = this.getResolvedAsset(dep);
        if (!resolved) {
          continue;
        }
        let result = this.getSymbolResolution(resolved, symbol, boundary);

        // We found the symbol
        if (result.symbol != undefined) {
          if (assetOutside) {
            // ..., but `asset` is outside, return `asset` and the original symbol
            found = true;
            break;
          }
          if (this.isDependencySkipped(dep)) {
            // We found the symbol and `dep` was skipped
            skipped = true;
            break;
          }

          return {
            asset: result.asset,
            symbol: result.symbol,
            exportSymbol: result.exportSymbol,
            loc: resolved.symbols?.get(symbol)?.loc,
          };
        }
        if (result.symbol === null) {
          found = true;
          if (boundary && !this.bundleHasAsset(boundary, result.asset)) {
            // If the returned asset is outside (and it's the first asset that is outside), return it.
            if (!assetOutside) {
              return {
                asset: result.asset,
                symbol: result.symbol,
                exportSymbol: result.exportSymbol,
                loc: resolved.symbols?.get(symbol)?.loc,
              };
            } else {
              // Otherwise the original asset will be returned at the end.
              break;
            }
          } else {
            // We didn't find it in this dependency, but it might still be there: bailout.
            // Continue searching though, with the assumption that there are no conficting reexports
            // and there might be a another (re)export (where we might statically find the symbol).
            potentialResults.push({
              asset: result.asset,
              symbol: result.symbol,
              exportSymbol: result.exportSymbol,
              loc: resolved.symbols?.get(symbol)?.loc,
            });
          }
        }
      }
    }
    // We didn't find the exact symbol...
    if (potentialResults.length == 1) {
      // ..., but if it does exist, it has to be behind this one reexport.
      return potentialResults[0];
    } else {
      // ... and there is no single reexport, but `bailout` tells us if it might still be exported.
      return {
        asset,
        exportSymbol: symbol,
        symbol: skipped
          ? false
          : found
          ? null
          : identifier ?? (asset.symbols?.has('*') ? null : undefined),
        loc: asset.symbols?.get(symbol)?.loc,
      };
    }
  }
  getAssetById(contentKey: string): Asset {
    let node = this._graph.getNodeByContentKey(contentKey);
    if (node == null) {
      throw new Error('Node not found');
    } else if (node.type !== 'asset') {
      throw new Error('Node was not an asset');
    }

    return node.value;
  }

  getAssetPublicId(asset: Asset): string {
    let publicId = this._publicIdByAssetId.get(asset.id);
    if (publicId == null) {
      throw new Error("Asset or it's public id not found");
    }

    return publicId;
  }

  getExportedSymbols(
    asset: Asset,
    boundary: ?Bundle,
  ): Array<InternalExportSymbolResolution> {
    if (!asset.symbols) {
      return [];
    }

    let symbols = [];

    for (let symbol of asset.symbols.keys()) {
      symbols.push({
        ...this.getSymbolResolution(asset, symbol, boundary),
        exportAs: symbol,
      });
    }

    let deps = this.getDependencies(asset);
    for (let dep of deps) {
      let depSymbols = dep.symbols;
      if (!depSymbols) continue;

      if (depSymbols.get('*')?.local === '*') {
        let resolved = this.getResolvedAsset(dep);
        if (!resolved) continue;
        let exported = this.getExportedSymbols(resolved, boundary)
          .filter(s => s.exportSymbol !== 'default')
          .map(s => ({...s, exportAs: s.exportSymbol}));
        symbols.push(...exported);
      }
    }

    return symbols;
  }

  getContentHash(bundle: Bundle): string {
    let existingHash = this._bundleContentHashes.get(bundle.id);
    if (existingHash != null) {
      return existingHash;
    }

    let hash = new Hash();
    // TODO: sort??
    this.traverseAssets(bundle, asset => {
      hash.writeString(
        [
          this.getAssetPublicId(asset),
          asset.outputHash,
          asset.filePath,
          querystring.stringify(asset.query),
          asset.type,
          asset.uniqueKey,
        ].join(':'),
      );
    });

    let hashHex = hash.finish();
    this._bundleContentHashes.set(bundle.id, hashHex);
    return hashHex;
  }

  getInlineBundles(bundle: Bundle): Array<Bundle> {
    let bundles = [];
    let seen = new Set();
    let addReferencedBundles = bundle => {
      if (seen.has(bundle.id)) {
        return;
      }

      seen.add(bundle.id);

      let referencedBundles = this.getReferencedBundles(bundle, {
        includeInline: true,
      });
      for (let referenced of referencedBundles) {
        if (referenced.bundleBehavior === BundleBehavior.inline) {
          bundles.push(referenced);
          addReferencedBundles(referenced);
        }
      }
    };

    addReferencedBundles(bundle);

    this.traverseBundles((childBundle, _, traversal) => {
      if (childBundle.bundleBehavior === BundleBehavior.inline) {
        bundles.push(childBundle);
      } else if (childBundle.id !== bundle.id) {
        traversal.skipChildren();
      }
    }, bundle);

    return bundles;
  }

  getHash(bundle: Bundle): string {
    let hash = new Hash();
    hash.writeString(
      bundle.id + bundle.target.publicUrl + this.getContentHash(bundle),
    );

    let inlineBundles = this.getInlineBundles(bundle);
    for (let inlineBundle of inlineBundles) {
      hash.writeString(this.getContentHash(inlineBundle));
    }

    for (let referencedBundle of this.getReferencedBundles(bundle)) {
      hash.writeString(referencedBundle.id);
    }

    hash.writeString(JSON.stringify(objectSortedEntriesDeep(bundle.env)));
    return hash.finish();
  }

  getBundleGraphHash(): string {
    let hashes = '';
    for (let bundle of this.getBundles()) {
      hashes += this.getHash(bundle);
    }

    return hashString(hashes);
  }

  addBundleToBundleGroup(bundle: Bundle, bundleGroup: BundleGroup) {
    let bundleGroupNodeId = this._graph.getNodeIdByContentKey(
      getBundleGroupId(bundleGroup),
    );
    let bundleNodeId = this._graph.getNodeIdByContentKey(bundle.id);
    if (this._graph.hasEdge(bundleGroupNodeId, bundleNodeId, 'bundle')) {
      // Bundle group already has bundle
      return;
    }

    this._graph.addEdge(bundleGroupNodeId, bundleNodeId);
    this._graph.addEdge(bundleGroupNodeId, bundleNodeId, 'bundle');

    for (let entryAssetId of bundle.entryAssetIds) {
      let entryAssetNodeId = this._graph.getNodeIdByContentKey(entryAssetId);
      if (this._graph.hasEdge(bundleGroupNodeId, entryAssetNodeId)) {
        this._graph.removeEdge(bundleGroupNodeId, entryAssetNodeId);
      }
    }
  }

  getUsedSymbolsAsset(asset: Asset): $ReadOnlySet<Symbol> {
    let node = this._graph.getNodeByContentKey(asset.id);
    invariant(node && node.type === 'asset');
    return makeReadOnlySet(node.usedSymbols);
  }

  getUsedSymbolsDependency(dep: Dependency): $ReadOnlySet<Symbol> {
    let node = this._graph.getNodeByContentKey(dep.id);
    invariant(node && node.type === 'dependency');
    return makeReadOnlySet(node.usedSymbolsUp);
  }

  merge(other: BundleGraph) {
    let otherGraphIdToThisNodeId = new Map<NodeId, NodeId>();
    for (let [otherNodeId, otherNode] of other._graph.nodes) {
      if (this._graph.hasContentKey(otherNode.id)) {
        let existingNodeId = this._graph.getNodeIdByContentKey(otherNode.id);
        otherGraphIdToThisNodeId.set(otherNodeId, existingNodeId);

        let existingNode = nullthrows(this._graph.getNode(existingNodeId));
        // Merge symbols, recompute dep.exluded based on that
        if (existingNode.type === 'asset') {
          invariant(otherNode.type === 'asset');
          existingNode.usedSymbols = new Set([
            ...existingNode.usedSymbols,
            ...otherNode.usedSymbols,
          ]);
        } else if (existingNode.type === 'dependency') {
          invariant(otherNode.type === 'dependency');
          existingNode.usedSymbolsDown = new Set([
            ...existingNode.usedSymbolsDown,
            ...otherNode.usedSymbolsDown,
          ]);
          existingNode.usedSymbolsUp = new Set([
            ...existingNode.usedSymbolsUp,
            ...otherNode.usedSymbolsUp,
          ]);

          existingNode.excluded =
            (existingNode.excluded || Boolean(existingNode.hasDeferred)) &&
            (otherNode.excluded || Boolean(otherNode.hasDeferred));
        }
      } else {
        let updateNodeId = this._graph.addNodeByContentKey(
          otherNode.id,
          otherNode,
        );
        otherGraphIdToThisNodeId.set(otherNodeId, updateNodeId);
      }
    }

    for (let edge of other._graph.getAllEdges()) {
      this._graph.addEdge(
        nullthrows(otherGraphIdToThisNodeId.get(edge.from)),
        nullthrows(otherGraphIdToThisNodeId.get(edge.to)),
        edge.type,
      );
    }
  }

  isEntryBundleGroup(bundleGroup: BundleGroup): boolean {
    return this._graph
      .getNodeIdsConnectedTo(
        nullthrows(
          this._graph.getNodeIdByContentKey(getBundleGroupId(bundleGroup)),
        ),
        'bundle',
      )
      .map(id => nullthrows(this._graph.getNode(id)))
      .some(n => n.type === 'root');
  }

  getEntryRoot(projectRoot: FilePath, target: Target): FilePath {
    let cached = this._targetEntryRoots.get(target.distDir);
    if (cached != null) {
      return cached;
    }

    let entryBundleGroupIds = this._graph.getNodeIdsConnectedFrom(
      nullthrows(this._graph.rootNodeId),
      'bundle',
    );

    let entries = [];
    for (let bundleGroupId of entryBundleGroupIds) {
      let bundleGroupNode = this._graph.getNode(bundleGroupId);
      invariant(bundleGroupNode?.type === 'bundle_group');

      if (bundleGroupNode.value.target.distDir === target.distDir) {
        let entryAssetNode = this._graph.getNodeByContentKey(
          bundleGroupNode.value.entryAssetId,
        );
        invariant(entryAssetNode?.type === 'asset');
        entries.push(
          fromProjectPath(projectRoot, entryAssetNode.value.filePath),
        );
      }
    }

    let root = getRootDir(entries);
    this._targetEntryRoots.set(target.distDir, root);
    return root;
  }
}
