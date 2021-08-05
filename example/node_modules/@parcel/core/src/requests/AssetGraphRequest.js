// @flow strict-local

import type {Async, Symbol, Meta} from '@parcel/types';
import type {SharedReference} from '@parcel/workers';
import type {Diagnostic} from '@parcel/diagnostic';
import type {
  Asset,
  AssetGroup,
  AssetNode,
  AssetRequestInput,
  Dependency,
  DependencyNode,
  Entry,
  InternalSourceLocation,
  NodeId,
  ParcelOptions,
  Target,
} from '../types';
import type {StaticRunOpts, RunAPI} from '../RequestTracker';
import type {EntryResult} from './EntryRequest';
import type {PathRequestInput} from './PathRequest';

import invariant from 'assert';
import nullthrows from 'nullthrows';
import {PromiseQueue} from '@parcel/utils';
import {hashString} from '@parcel/hash';
import ThrowableDiagnostic, {md} from '@parcel/diagnostic';
import {Priority} from '../types';
import AssetGraph from '../AssetGraph';
import {PARCEL_VERSION} from '../constants';
import createEntryRequest from './EntryRequest';
import createTargetRequest from './TargetRequest';
import createAssetRequest from './AssetRequest';
import createPathRequest from './PathRequest';
import {
  type ProjectPath,
  fromProjectPathRelative,
  fromProjectPath,
} from '../projectPath';

import dumpToGraphViz from '../dumpGraphToGraphViz';

type AssetGraphRequestInput = {|
  entries?: Array<ProjectPath>,
  assetGroups?: Array<AssetGroup>,
  optionsRef: SharedReference,
  name: string,
  shouldBuildLazily?: boolean,
  requestedAssetIds?: Set<string>,
|};

type AssetGraphRequestResult = {|
  assetGraph: AssetGraph,
  changedAssets: Map<string, Asset>,
  assetRequests: Array<AssetGroup>,
|};

type RunInput = {|
  input: AssetGraphRequestInput,
  ...StaticRunOpts,
|};

type AssetGraphRequest = {|
  id: string,
  +type: 'asset_graph_request',
  run: RunInput => Async<{|
    assetGraph: AssetGraph,
    changedAssets: Map<string, Asset>,
    assetRequests: Array<AssetGroup>,
  |}>,
  input: AssetGraphRequestInput,
|};

export default function createAssetGraphRequest(
  input: AssetGraphRequestInput,
): AssetGraphRequest {
  return {
    type: 'asset_graph_request',
    id: input.name,
    run: async input => {
      let prevResult = await input.api.getPreviousResult<AssetGraphRequestResult>();
      let builder = new AssetGraphBuilder(input, prevResult);
      return builder.build();
    },
    input,
  };
}

const typesWithRequests = new Set([
  'entry_specifier',
  'entry_file',
  'dependency',
  'asset_group',
]);

export class AssetGraphBuilder {
  assetGraph: AssetGraph;
  assetRequests: Array<AssetGroup>;
  queue: PromiseQueue<mixed>;
  changedAssets: Map<string, Asset> = new Map();
  optionsRef: SharedReference;
  options: ParcelOptions;
  api: RunAPI;
  name: string;
  assetRequests: Array<AssetGroup> = [];
  cacheKey: string;
  shouldBuildLazily: boolean;
  requestedAssetIds: Set<string>;

  constructor(
    {input, api, options}: RunInput,
    prevResult: ?AssetGraphRequestResult,
  ) {
    let {
      entries,
      assetGroups,
      optionsRef,
      name,
      requestedAssetIds,
      shouldBuildLazily,
    } = input;
    let assetGraph = prevResult?.assetGraph ?? new AssetGraph();
    assetGraph.setRootConnections({
      entries,
      assetGroups,
    });
    this.assetGraph = assetGraph;
    this.optionsRef = optionsRef;
    this.options = options;
    this.api = api;
    this.name = name;
    this.requestedAssetIds = requestedAssetIds ?? new Set();
    this.shouldBuildLazily = shouldBuildLazily ?? false;
    this.cacheKey = hashString(
      `${PARCEL_VERSION}${name}${JSON.stringify(entries) ?? ''}`,
    );

    this.queue = new PromiseQueue();
  }

  async build(): Promise<AssetGraphRequestResult> {
    let errors = [];
    let rootNodeId = nullthrows(
      this.assetGraph.rootNodeId,
      'A root node is required to traverse',
    );

    let visited = new Set([rootNodeId]);
    const visit = (nodeId: NodeId) => {
      if (errors.length > 0) {
        return;
      }

      if (this.shouldSkipRequest(nodeId)) {
        visitChildren(nodeId);
      } else {
        // ? do we need to visit children inside of the promise that is queued?
        this.queueCorrespondingRequest(nodeId, errors).then(() =>
          visitChildren(nodeId),
        );
      }
    };

    const visitChildren = (nodeId: NodeId) => {
      for (let childNodeId of this.assetGraph.getNodeIdsConnectedFrom(nodeId)) {
        let child = nullthrows(this.assetGraph.getNode(childNodeId));
        if (
          (!visited.has(childNodeId) || child.hasDeferred) &&
          this.shouldVisitChild(nodeId, childNodeId)
        ) {
          visited.add(childNodeId);
          visit(childNodeId);
        }
      }
    };

    visit(rootNodeId);
    await this.queue.run();

    this.api.storeResult(
      {
        assetGraph: this.assetGraph,
        changedAssets: new Map(),
        assetRequests: [],
      },
      this.cacheKey,
    );

    if (errors.length) {
      throw errors[0]; // TODO: eventually support multiple errors since requests could reject in parallel
    }
    // Skip symbol propagation if no target is using scope hoisting
    // (mainly for faster development builds)
    let entryDependencies = this.assetGraph
      .getNodeIdsConnectedFrom(rootNodeId)
      .flatMap(entrySpecifier =>
        this.assetGraph.getNodeIdsConnectedFrom(entrySpecifier),
      )
      .flatMap(entryFile =>
        this.assetGraph.getNodeIdsConnectedFrom(entryFile).map(depNodeId => {
          let dep = nullthrows(this.assetGraph.getNode(depNodeId));
          invariant(dep.type === 'dependency');
          return dep;
        }),
      );
    if (entryDependencies.some(d => d.value.env.shouldScopeHoist)) {
      try {
        this.propagateSymbols();
      } catch (e) {
        dumpToGraphViz(this.assetGraph, 'AssetGraph_' + this.name + '_failed');
        throw e;
      }
    }
    dumpToGraphViz(this.assetGraph, 'AssetGraph_' + this.name);

    return {
      assetGraph: this.assetGraph,
      changedAssets: this.changedAssets,
      assetRequests: this.assetRequests,
    };
  }

  shouldVisitChild(nodeId: NodeId, childNodeId: NodeId): boolean {
    if (this.shouldBuildLazily) {
      let node = nullthrows(this.assetGraph.getNode(nodeId));
      let childNode = nullthrows(this.assetGraph.getNode(childNodeId));
      if (node.type === 'asset' && childNode.type === 'dependency') {
        if (this.requestedAssetIds.has(node.value.id)) {
          node.requested = true;
        } else if (!node.requested) {
          let isAsyncChild = this.assetGraph
            .getIncomingDependencies(node.value)
            .every(dep => dep.isEntry || dep.priority !== Priority.sync);
          if (isAsyncChild) {
            node.requested = false;
          } else {
            delete node.requested;
          }
        }

        let previouslyDeferred = childNode.deferred;
        childNode.deferred = node.requested === false;

        if (!previouslyDeferred && childNode.deferred) {
          this.assetGraph.markParentsWithHasDeferred(childNodeId);
        } else if (previouslyDeferred && !childNode.deferred) {
          this.assetGraph.unmarkParentsWithHasDeferred(childNodeId);
        }

        return !childNode.deferred;
      }
    }

    return this.assetGraph.shouldVisitChild(nodeId, childNodeId);
  }

  propagateSymbols() {
    // Propagate the requested symbols down from the root to the leaves
    this.propagateSymbolsDown((assetNode, incomingDeps, outgoingDeps) => {
      if (!assetNode.value.symbols) return;

      // exportSymbol -> identifier
      let assetSymbols: $ReadOnlyMap<
        Symbol,
        {|local: Symbol, loc: ?InternalSourceLocation, meta?: ?Meta|},
      > = assetNode.value.symbols;
      // identifier -> exportSymbol
      let assetSymbolsInverse;
      assetSymbolsInverse = new Map<Symbol, Set<Symbol>>();
      for (let [s, {local}] of assetSymbols) {
        let set = assetSymbolsInverse.get(local);
        if (!set) {
          set = new Set();
          assetSymbolsInverse.set(local, set);
        }
        set.add(s);
      }
      let hasNamespaceOutgoingDeps = outgoingDeps.some(
        d => d.value.symbols?.get('*')?.local === '*',
      );

      // 1) Determine what the incomingDeps requests from the asset
      // ----------------------------------------------------------

      let isEntry = false;

      // Used symbols that are exported or reexported (symbol will be removed again later) by asset.
      assetNode.usedSymbols = new Set();

      // Symbols that have to be namespace reexported by outgoingDeps.
      let namespaceReexportedSymbols = new Set<Symbol>();

      if (incomingDeps.length === 0) {
        // Root in the runtimes Graph
        assetNode.usedSymbols.add('*');
        namespaceReexportedSymbols.add('*');
      } else {
        for (let incomingDep of incomingDeps) {
          if (incomingDep.value.symbols == null) {
            isEntry = true;
            continue;
          }

          for (let exportSymbol of incomingDep.usedSymbolsDown) {
            if (exportSymbol === '*') {
              assetNode.usedSymbols.add('*');
              namespaceReexportedSymbols.add('*');
            }
            if (
              !assetSymbols ||
              assetSymbols.has(exportSymbol) ||
              assetSymbols.has('*')
            ) {
              // An own symbol or a non-namespace reexport
              assetNode.usedSymbols.add(exportSymbol);
            }
            // A namespace reexport
            // (but only if we actually have namespace-exporting outgoing dependencies,
            // This usually happens with a reexporting asset with many namespace exports which means that
            // we cannot match up the correct asset with the used symbol at this level.)
            else if (hasNamespaceOutgoingDeps && exportSymbol !== 'default') {
              namespaceReexportedSymbols.add(exportSymbol);
            }
          }
        }
      }

      // 2) Distribute the symbols to the outgoing dependencies
      // ----------------------------------------------------------
      for (let dep of outgoingDeps) {
        let depUsedSymbolsDownOld = dep.usedSymbolsDown;
        let depUsedSymbolsDown = new Set();
        dep.usedSymbolsDown = depUsedSymbolsDown;
        if (
          assetNode.value.sideEffects ||
          // For entries, we still need to add dep.value.symbols of the entry (which are "used" but not according to the symbols data)
          isEntry ||
          // If not a single asset is used, we can say the entire subgraph is not used.
          // This is e.g. needed when some symbol is imported and then used for a export which isn't used (= "semi-weak" reexport)
          //    index.js:     `import {bar} from "./lib"; ...`
          //    lib/index.js: `export * from "./foo.js"; export * from "./bar.js";`
          //    lib/foo.js:   `import { data } from "./bar.js"; export const foo = data + " esm2";`
          assetNode.usedSymbols.size > 0 ||
          namespaceReexportedSymbols.size > 0
        ) {
          let depSymbols = dep.value.symbols;
          if (!depSymbols) continue;

          if (depSymbols.get('*')?.local === '*') {
            for (let s of namespaceReexportedSymbols) {
              // We need to propagate the namespaceReexportedSymbols to all namespace dependencies (= even wrong ones because we don't know yet)
              depUsedSymbolsDown.add(s);
            }
          }

          for (let [symbol, {local}] of depSymbols) {
            // Was already handled above
            if (local === '*') continue;

            if (!assetSymbolsInverse || !depSymbols.get(symbol)?.isWeak) {
              // Bailout or non-weak symbol (= used in the asset itself = not a reexport)
              depUsedSymbolsDown.add(symbol);
            } else {
              let reexportedExportSymbols = assetSymbolsInverse.get(local);
              if (reexportedExportSymbols == null) {
                // not reexported = used in asset itself
                depUsedSymbolsDown.add(symbol);
              } else if (assetNode.usedSymbols.has('*')) {
                // we need everything
                depUsedSymbolsDown.add(symbol);

                [...reexportedExportSymbols].forEach(s =>
                  assetNode.usedSymbols.delete(s),
                );
              } else {
                let usedReexportedExportSymbols = [
                  ...reexportedExportSymbols,
                ].filter(s => assetNode.usedSymbols.has(s));
                if (usedReexportedExportSymbols.length > 0) {
                  // The symbol is indeed a reexport, so it's not used from the asset itself
                  depUsedSymbolsDown.add(symbol);

                  usedReexportedExportSymbols.forEach(s =>
                    assetNode.usedSymbols.delete(s),
                  );
                }
              }
            }
          }
        } else {
          depUsedSymbolsDown.clear();
        }
        if (!equalSet(depUsedSymbolsDownOld, depUsedSymbolsDown)) {
          dep.usedSymbolsDownDirty = true;
          dep.usedSymbolsUpDirtyDown = true;
        }
      }
    });

    // Because namespace reexports introduce ambiguity, go up the graph from the leaves to the
    // root and remove requested symbols that aren't actually exported
    this.propagateSymbolsUp((assetNode, incomingDeps, outgoingDeps) => {
      invariant(assetNode.type === 'asset');

      let assetSymbols: ?$ReadOnlyMap<
        Symbol,
        {|local: Symbol, loc: ?InternalSourceLocation, meta?: ?Meta|},
      > = assetNode.value.symbols;

      let assetSymbolsInverse = null;
      if (assetSymbols) {
        assetSymbolsInverse = new Map<Symbol, Set<Symbol>>();
        for (let [s, {local}] of assetSymbols) {
          let set = assetSymbolsInverse.get(local);
          if (!set) {
            set = new Set();
            assetSymbolsInverse.set(local, set);
          }
          set.add(s);
        }
      }

      let reexportedSymbols = new Set<Symbol>();
      for (let outgoingDep of outgoingDeps) {
        let outgoingDepSymbols = outgoingDep.value.symbols;
        if (!outgoingDepSymbols) continue;

        // excluded, assume everything that is requested exists
        if (
          this.assetGraph.getNodeIdsConnectedFrom(
            this.assetGraph.getNodeIdByContentKey(outgoingDep.id),
          ).length === 0
        ) {
          outgoingDep.usedSymbolsDown.forEach(s =>
            outgoingDep.usedSymbolsUp.add(s),
          );
        }

        if (outgoingDepSymbols.get('*')?.local === '*') {
          outgoingDep.usedSymbolsUp.forEach(s => reexportedSymbols.add(s));
        }

        for (let s of outgoingDep.usedSymbolsUp) {
          if (!outgoingDep.usedSymbolsDown.has(s)) {
            // usedSymbolsDown is a superset of usedSymbolsUp
            continue;
          }

          let local = outgoingDepSymbols.get(s)?.local;
          if (local == null) {
            // Caused by '*' => '*', already handled
            continue;
          }

          let reexported = assetSymbolsInverse?.get(local);
          if (reexported != null) {
            reexported.forEach(s => reexportedSymbols.add(s));
          }
        }
      }

      let errors: Array<Diagnostic> = [];

      for (let incomingDep of incomingDeps) {
        let incomingDepUsedSymbolsUpOld = incomingDep.usedSymbolsUp;
        incomingDep.usedSymbolsUp = new Set();
        let incomingDepSymbols = incomingDep.value.symbols;
        if (!incomingDepSymbols) continue;

        let hasNamespaceReexport = incomingDepSymbols.get('*')?.local === '*';
        for (let s of incomingDep.usedSymbolsDown) {
          if (
            assetSymbols == null || // Assume everything could be provided if symbols are cleared
            assetNode.usedSymbols.has(s) ||
            reexportedSymbols.has(s) ||
            s === '*'
          ) {
            incomingDep.usedSymbolsUp.add(s);
          } else if (!hasNamespaceReexport) {
            let loc = incomingDep.value.symbols?.get(s)?.loc;
            let [resolutionNodeId] = this.assetGraph.getNodeIdsConnectedFrom(
              this.assetGraph.getNodeIdByContentKey(incomingDep.id),
            );
            let resolution = nullthrows(
              this.assetGraph.getNode(resolutionNodeId),
            );
            invariant(resolution && resolution.type === 'asset_group');

            errors.push({
              message: md`${fromProjectPathRelative(
                resolution.value.filePath,
              )} does not export '${s}'`,
              origin: '@parcel/core',
              codeFrames: loc
                ? [
                    {
                      filePath:
                        fromProjectPath(
                          this.options.projectRoot,
                          loc?.filePath,
                        ) ?? undefined,
                      language: assetNode.value.type,
                      codeHighlights: [
                        {
                          start: loc.start,
                          end: loc.end,
                        },
                      ],
                    },
                  ]
                : undefined,
            });
          }
        }

        if (!equalSet(incomingDepUsedSymbolsUpOld, incomingDep.usedSymbolsUp)) {
          incomingDep.usedSymbolsUpDirtyUp = true;
        }

        incomingDep.excluded = false;
        if (
          incomingDep.value.symbols != null &&
          incomingDep.usedSymbolsUp.size === 0
        ) {
          let assetGroups = this.assetGraph.getNodeIdsConnectedFrom(
            this.assetGraph.getNodeIdByContentKey(incomingDep.id),
          );
          if (assetGroups.length === 1) {
            let [assetGroupId] = assetGroups;
            let assetGroup = nullthrows(this.assetGraph.getNode(assetGroupId));
            if (
              assetGroup.type === 'asset_group' &&
              assetGroup.value.sideEffects === false
            ) {
              incomingDep.excluded = true;
            }
          } else {
            invariant(assetGroups.length === 0);
          }
        }
      }
      return errors;
    });
  }

  propagateSymbolsDown(
    visit: (
      assetNode: AssetNode,
      incoming: $ReadOnlyArray<DependencyNode>,
      outgoing: $ReadOnlyArray<DependencyNode>,
    ) => void,
  ) {
    let rootNodeId = nullthrows(
      this.assetGraph.rootNodeId,
      'A root node is required to traverse',
    );
    let queue: Set<NodeId> = new Set([rootNodeId]);
    let visited = new Set<NodeId>();

    while (queue.size > 0) {
      let queuedNodeId = nullthrows(queue.values().next().value);
      queue.delete(queuedNodeId);

      let outgoing = this.assetGraph.getNodeIdsConnectedFrom(queuedNodeId);
      let node = nullthrows(this.assetGraph.getNode(queuedNodeId));

      let wasNodeDirty = false;
      if (node.type === 'dependency' || node.type === 'asset_group') {
        wasNodeDirty = node.usedSymbolsDownDirty;
        node.usedSymbolsDownDirty = false;
      } else if (node.type === 'asset' && node.usedSymbolsDownDirty) {
        visit(
          node,
          this.assetGraph.getIncomingDependencies(node.value).map(d => {
            let dep = this.assetGraph.getNodeByContentKey(d.id);
            invariant(dep && dep.type === 'dependency');
            return dep;
          }),
          outgoing.map(dep => {
            let depNode = nullthrows(this.assetGraph.getNode(dep));
            invariant(depNode.type === 'dependency');
            return depNode;
          }),
        );
        node.usedSymbolsDownDirty = false;
      }

      visited.add(queuedNodeId);
      for (let child of outgoing) {
        let childNode = nullthrows(this.assetGraph.getNode(child));
        let childDirty = false;
        if (
          (childNode.type === 'asset' || childNode.type === 'asset_group') &&
          wasNodeDirty
        ) {
          childNode.usedSymbolsDownDirty = true;
          childDirty = true;
        } else if (childNode.type === 'dependency') {
          childDirty = childNode.usedSymbolsDownDirty;
        }
        if (!visited.has(child) || childDirty) {
          queue.add(child);
        }
      }
    }
  }

  propagateSymbolsUp(
    visit: (
      assetNode: AssetNode,
      incoming: $ReadOnlyArray<DependencyNode>,
      outgoing: $ReadOnlyArray<DependencyNode>,
    ) => Array<Diagnostic>,
  ): void {
    let rootNodeId = nullthrows(
      this.assetGraph.rootNodeId,
      'A root node is required to traverse',
    );

    let errors = new Map<NodeId, Array<Diagnostic>>();

    let dirtyDeps = new Set<NodeId>();
    let visited = new Set([rootNodeId]);
    // post-order dfs
    const walk = (nodeId: NodeId) => {
      let node = nullthrows(this.assetGraph.getNode(nodeId));
      let outgoing = this.assetGraph.getNodeIdsConnectedFrom(nodeId);
      for (let childId of outgoing) {
        if (!visited.has(childId)) {
          visited.add(childId);
          walk(childId);
          let child = nullthrows(this.assetGraph.getNode(childId));
          if (node.type === 'asset') {
            invariant(child.type === 'dependency');
            if (child.usedSymbolsUpDirtyUp) {
              node.usedSymbolsUpDirty = true;
              child.usedSymbolsUpDirtyUp = false;
            }
          }
        }
      }

      if (node.type === 'asset') {
        let incoming = this.assetGraph
          .getIncomingDependencies(node.value)
          .map(d => {
            let n = this.assetGraph.getNodeByContentKey(d.id);
            invariant(n && n.type === 'dependency');
            return n;
          });
        for (let dep of incoming) {
          if (dep.usedSymbolsUpDirtyDown) {
            dep.usedSymbolsUpDirtyDown = false;
            node.usedSymbolsUpDirty = true;
          }
        }
        if (node.usedSymbolsUpDirty) {
          node.usedSymbolsUpDirty = false;
          let e = visit(
            node,
            incoming,
            outgoing.map(depNodeId => {
              let depNode = nullthrows(this.assetGraph.getNode(depNodeId));
              invariant(depNode.type === 'dependency');
              return depNode;
            }),
          );
          if (e.length > 0) {
            errors.set(nodeId, e);
          } else {
            errors.delete(nodeId);
          }
        }
      } else if (node.type === 'dependency') {
        if (node.usedSymbolsUpDirtyUp) {
          dirtyDeps.add(nodeId);
        } else {
          dirtyDeps.delete(nodeId);
        }
      }
    };
    walk(rootNodeId);
    // traverse circular dependencies if necessary (ancestors of `dirtyDeps`)
    visited = new Set();
    let queue = new Set(dirtyDeps);
    while (queue.size > 0) {
      let queuedNodeId = nullthrows(queue.values().next().value);
      queue.delete(queuedNodeId);
      visited.add(queuedNodeId);
      let node = nullthrows(this.assetGraph.getNode(queuedNodeId));
      if (node.type === 'asset') {
        let incoming = this.assetGraph
          .getIncomingDependencies(node.value)
          .map(dep => {
            let depNode = this.assetGraph.getNodeByContentKey(dep.id);
            invariant(depNode && depNode.type === 'dependency');
            return depNode;
          });
        let outgoing = this.assetGraph
          .getNodeIdsConnectedFrom(queuedNodeId)
          .map(depNodeId => {
            let depNode = nullthrows(this.assetGraph.getNode(depNodeId));

            invariant(depNode.type === 'dependency');
            return depNode;
          });
        for (let dep of outgoing) {
          if (dep.usedSymbolsUpDirtyUp) {
            node.usedSymbolsUpDirty = true;
            dep.usedSymbolsUpDirtyUp = false;
          }
        }
        if (node.usedSymbolsUpDirty) {
          let e = visit(node, incoming, outgoing);
          if (e.length > 0) {
            errors.set(queuedNodeId, e);
          } else {
            errors.delete(queuedNodeId);
          }
        }
        for (let i of incoming) {
          if (i.usedSymbolsUpDirtyUp) {
            queue.add(this.assetGraph.getNodeIdByContentKey(i.id));
          }
        }
      } else {
        let connectedNodes = this.assetGraph.getNodeIdsConnectedTo(
          queuedNodeId,
        );
        if (connectedNodes.length > 0) {
          queue.add(...connectedNodes);
        }
      }
    }
    // Just throw the first error. Since errors can bubble (e.g. reexporting a reexported symbol also fails),
    // determining which failing export is the root cause is nontrivial (because of circular dependencies).
    if (errors.size > 0) {
      throw new ThrowableDiagnostic({
        diagnostic: [...errors.values()][0],
      });
    }
  }

  shouldSkipRequest(nodeId: NodeId): boolean {
    let node = nullthrows(this.assetGraph.getNode(nodeId));
    return (
      node.complete === true ||
      !typesWithRequests.has(node.type) ||
      (node.correspondingRequest != null &&
        this.api.canSkipSubrequest(node.correspondingRequest))
    );
  }

  queueCorrespondingRequest(
    nodeId: NodeId,
    errors: Array<Error>,
  ): Promise<mixed> {
    let promise;
    let node = nullthrows(this.assetGraph.getNode(nodeId));
    switch (node.type) {
      case 'entry_specifier':
        promise = this.runEntryRequest(node.value);
        break;
      case 'entry_file':
        promise = this.runTargetRequest(node.value);
        break;
      case 'dependency':
        promise = this.runPathRequest(node.value);
        break;
      case 'asset_group':
        promise = this.runAssetRequest(node.value);
        break;
      default:
        throw new Error(
          `Can not queue corresponding request of node with type ${node.type}`,
        );
    }
    return this.queue.add(() =>
      promise.then(null, error => errors.push(error)),
    );
  }

  async runEntryRequest(input: ProjectPath) {
    let request = createEntryRequest(input);
    let result = await this.api.runRequest<ProjectPath, EntryResult>(request, {
      force: true,
    });
    this.assetGraph.resolveEntry(request.input, result.entries, request.id);
  }

  async runTargetRequest(input: Entry) {
    let request = createTargetRequest(input);
    let targets = await this.api.runRequest<Entry, Array<Target>>(request, {
      force: true,
    });
    this.assetGraph.resolveTargets(request.input, targets, request.id);
  }

  async runPathRequest(input: Dependency) {
    let request = createPathRequest({dependency: input, name: this.name});
    let result = await this.api.runRequest<PathRequestInput, ?AssetGroup>(
      request,
      {force: true},
    );
    this.assetGraph.resolveDependency(input, result, request.id);
  }

  async runAssetRequest(input: AssetGroup) {
    this.assetRequests.push(input);
    let request = createAssetRequest({
      ...input,
      name: this.name,
      optionsRef: this.optionsRef,
    });
    let assets = await this.api.runRequest<AssetRequestInput, Array<Asset>>(
      request,
      {force: true},
    );

    if (assets != null) {
      for (let asset of assets) {
        this.changedAssets.set(asset.id, asset);
      }
      this.assetGraph.resolveAssetGroup(input, assets, request.id);
    }
  }
}

function equalSet<T>(a: $ReadOnlySet<T>, b: $ReadOnlySet<T>) {
  return a.size === b.size && [...a].every(i => b.has(i));
}
