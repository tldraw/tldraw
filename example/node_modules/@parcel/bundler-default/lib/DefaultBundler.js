"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function _assert() {
  const data = _interopRequireDefault(require("assert"));

  _assert = function () {
    return data;
  };

  return data;
}

function _plugin() {
  const data = require("@parcel/plugin");

  _plugin = function () {
    return data;
  };

  return data;
}

function _utils() {
  const data = require("@parcel/utils");

  _utils = function () {
    return data;
  };

  return data;
}

function _hash() {
  const data = require("@parcel/hash");

  _hash = function () {
    return data;
  };

  return data;
}

function _nullthrows() {
  const data = _interopRequireDefault(require("nullthrows"));

  _nullthrows = function () {
    return data;
  };

  return data;
}

function _diagnostic() {
  const data = require("@parcel/diagnostic");

  _diagnostic = function () {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Default options by http version.
const HTTP_OPTIONS = {
  '1': {
    minBundles: 1,
    minBundleSize: 30000,
    maxParallelRequests: 6
  },
  '2': {
    minBundles: 1,
    minBundleSize: 20000,
    maxParallelRequests: 25
  }
};
let skipOptimize = false;

var _default = new (_plugin().Bundler)({
  // RULES:
  // 1. If dep.isAsync or dep.isEntry, start a new bundle group.
  // 2. If an asset is a different type than the current bundle, make a parallel bundle in the same bundle group.
  // 3. If an asset is already in a parent bundle in the same entry point, exclude from child bundles.
  // 4. If an asset is only in separate isolated entry points (e.g. workers, different HTML pages), duplicate it.
  loadConfig({
    config,
    options
  }) {
    return loadBundlerConfig(config, options);
  },

  bundle({
    bundleGraph,
    config
  }) {
    let bundleRoots = new Map();
    let bundlesByEntryAsset = new Map(); // Step 1: create bundles for each of the explicit code split points.

    bundleGraph.traverse({
      enter: (node, context, actions) => {
        if (node.type !== 'dependency') {
          var _bundlesByEntryAsset$;

          return { ...context,
            bundleGroup: context === null || context === void 0 ? void 0 : context.bundleGroup,
            bundleByType: context === null || context === void 0 ? void 0 : context.bundleByType,
            parentNode: node,
            parentBundle: (_bundlesByEntryAsset$ = bundlesByEntryAsset.get(node.value)) !== null && _bundlesByEntryAsset$ !== void 0 ? _bundlesByEntryAsset$ : context === null || context === void 0 ? void 0 : context.parentBundle
          };
        }

        let dependency = node.value;

        if (bundleGraph.isDependencySkipped(dependency)) {
          actions.skipChildren();
          return;
        }

        let assets = bundleGraph.getDependencyAssets(dependency);
        let resolution = bundleGraph.getResolvedAsset(dependency);
        let bundleGroup = context === null || context === void 0 ? void 0 : context.bundleGroup; // Create a new bundle for entries, lazy/parallel dependencies, isolated/inline assets.

        if (resolution && (!bundleGroup || dependency.priority === 'lazy' || dependency.priority === 'parallel' || resolution.bundleBehavior === 'isolated' || resolution.bundleBehavior === 'inline')) {
          var _context$bundleByType;

          let bundleByType = (_context$bundleByType = context === null || context === void 0 ? void 0 : context.bundleByType) !== null && _context$bundleByType !== void 0 ? _context$bundleByType : new Map(); // Only create a new bundle group for entries, lazy dependencies, and isolated assets.
          // Otherwise, the bundle is loaded together with the parent bundle.

          if (!bundleGroup || dependency.priority === 'lazy' || resolution.bundleBehavior === 'isolated') {
            var _dependency$target, _context$bundleGroup;

            bundleGroup = bundleGraph.createBundleGroup(dependency, (0, _nullthrows().default)((_dependency$target = dependency.target) !== null && _dependency$target !== void 0 ? _dependency$target : context === null || context === void 0 ? void 0 : (_context$bundleGroup = context.bundleGroup) === null || _context$bundleGroup === void 0 ? void 0 : _context$bundleGroup.target));
            bundleByType = new Map();
          }

          for (let asset of assets) {
            var _dependency$bundleBeh;

            let bundle = bundleGraph.createBundle({
              entryAsset: asset,
              needsStableName: dependency.bundleBehavior === 'inline' || asset.bundleBehavior === 'inline' ? false : dependency.isEntry || dependency.needsStableName,
              bundleBehavior: (_dependency$bundleBeh = dependency.bundleBehavior) !== null && _dependency$bundleBeh !== void 0 ? _dependency$bundleBeh : asset.bundleBehavior,
              target: bundleGroup.target
            });
            bundleByType.set(bundle.type, bundle);
            bundlesByEntryAsset.set(asset, bundle);
            bundleGraph.addBundleToBundleGroup(bundle, bundleGroup); // The bundle may have already been created, and the graph gave us back the original one...

            if (!bundleRoots.has(bundle)) {
              bundleRoots.set(bundle, [asset]);
            } // If the bundle is in the same bundle group as the parent, create an asset reference
            // between the dependency, the asset, and the target bundle.


            if (bundleGroup === (context === null || context === void 0 ? void 0 : context.bundleGroup)) {
              bundleGraph.createAssetReference(dependency, asset, bundle);
            }
          }

          return {
            bundleGroup,
            bundleByType,
            parentNode: node,
            parentBundle: context === null || context === void 0 ? void 0 : context.parentBundle
          };
        }

        (0, _assert().default)(context != null);
        (0, _assert().default)(context.parentNode.type === 'asset');
        (0, _assert().default)(context.parentBundle != null);
        (0, _assert().default)(bundleGroup != null);
        let parentAsset = context.parentNode.value;
        let parentBundle = context.parentBundle;
        let bundleByType = (0, _nullthrows().default)(context.bundleByType);

        for (let asset of assets) {
          if (parentAsset.type === asset.type) {
            continue;
          }

          let existingBundle = bundleByType.get(asset.type);

          if (existingBundle) {
            // If a bundle of this type has already been created in this group,
            // merge this subgraph into it.
            (0, _nullthrows().default)(bundleRoots.get(existingBundle)).push(asset);
            bundlesByEntryAsset.set(asset, existingBundle);
            bundleGraph.createAssetReference(dependency, asset, existingBundle);
          } else {
            var _dependency$bundleBeh2, _asset$isBundleSplitt;

            let bundle = bundleGraph.createBundle({
              uniqueKey: asset.id,
              env: asset.env,
              type: asset.type,
              target: bundleGroup.target,
              needsStableName: asset.bundleBehavior === 'inline' || dependency.bundleBehavior === 'inline' || dependency.priority === 'parallel' && !dependency.needsStableName ? false : parentBundle.needsStableName,
              bundleBehavior: (_dependency$bundleBeh2 = dependency.bundleBehavior) !== null && _dependency$bundleBeh2 !== void 0 ? _dependency$bundleBeh2 : asset.bundleBehavior,
              isSplittable: (_asset$isBundleSplitt = asset.isBundleSplittable) !== null && _asset$isBundleSplitt !== void 0 ? _asset$isBundleSplitt : true,
              pipeline: asset.pipeline
            });
            bundleByType.set(bundle.type, bundle);
            bundlesByEntryAsset.set(asset, bundle);
            bundleGraph.createAssetReference(dependency, asset, bundle); // The bundle may have already been created, and the graph gave us back the original one...

            if (!bundleRoots.has(bundle)) {
              bundleRoots.set(bundle, [asset]);
            }
          }
        }

        return { ...context,
          parentNode: node
        };
      }
    });

    for (let [bundle, rootAssets] of bundleRoots) {
      for (let asset of rootAssets) {
        bundleGraph.addEntryToBundle(asset, bundle);
      }
    } // If there's only one bundle, we can skip the rest of the steps.


    skipOptimize = bundleRoots.size === 1;

    if (skipOptimize) {
      return;
    }

    (0, _assert().default)(config != null); // Step 2: Remove asset graphs that begin with entries to other bundles.

    bundleGraph.traverseBundles(bundle => {
      if (bundle.bundleBehavior === 'inline' || bundle.bundleBehavior === 'isolated' || !bundle.isSplittable || bundle.env.isIsolated()) {
        return;
      } // Skip bundles where the entry is reachable in a parent bundle. This can occur when both synchronously and
      // asynchronously importing an asset from a bundle. This asset will later be internalized into the parent.


      let entries = bundle.getEntryAssets();
      let mainEntry = entries[0];

      if (mainEntry == null || entries.length !== 1 || bundleGraph.isAssetReachableFromBundle(mainEntry, bundle)) {
        return;
      }

      let candidates = bundleGraph.getBundlesWithAsset(mainEntry).filter(containingBundle => containingBundle.id !== bundle.id && // Don't add to BundleGroups for entry bundles, as that would require
      // another entry bundle depending on these conditions, making it difficult
      // to predict and reference.
      // TODO: reconsider this. This is only true for the global output format.
      !containingBundle.needsStableName && containingBundle.bundleBehavior !== 'inline' && containingBundle.bundleBehavior !== 'isolated' && containingBundle.isSplittable);

      for (let candidate of candidates) {
        let bundleGroups = bundleGraph.getBundleGroupsContainingBundle(candidate);

        if (Array.from(bundleGroups).every(group => bundleGraph.getBundlesInBundleGroup(group).length < config.maxParallelRequests)) {
          bundleGraph.createBundleReference(candidate, bundle);
          bundleGraph.removeAssetGraphFromBundle(mainEntry, candidate);
        }
      }
    }); // Step 3: Remove assets that are duplicated in a parent bundle.

    deduplicate(bundleGraph);
    internalizeReachableAsyncDependencies(bundleGraph);
  },

  optimize({
    bundleGraph,
    config
  }) {
    // if only one bundle, no need to optimize
    if (skipOptimize) {
      return;
    }

    (0, _assert().default)(config != null); // Step 5: Find duplicated assets in different bundle groups, and separate them into their own parallel bundles.
    // If multiple assets are always seen together in the same bundles, combine them together.
    // If the sub-graph from an asset is >= 30kb, and the number of parallel requests in the bundle group is < 5, create a new bundle containing the sub-graph.

    let candidateBundles = new Map();
    bundleGraph.traverse((node, ctx, actions) => {
      if (node.type !== 'asset') {
        return;
      }

      let asset = node.value;
      let containingBundles = bundleGraph.getBundlesWithAsset(asset) // Don't create shared bundles from entry bundles, as that would require
      // another entry bundle depending on these conditions, making it difficult
      // to predict and reference.
      // TODO: reconsider this. This is only true for the global output format.
      // This also currently affects other bundles with stable names, e.g. service workers.
      .filter(b => {
        let entries = b.getEntryAssets();
        return !b.needsStableName && b.isSplittable && entries.every(entry => entry.id !== asset.id);
      });

      if (containingBundles.length > config.minBundles) {
        let id = containingBundles.map(b => b.id).sort().join(':');
        let candidate = candidateBundles.get(id);

        if (candidate) {
          candidate.assets.push(asset);

          for (let bundle of containingBundles) {
            candidate.sourceBundles.add(bundle);
          }

          candidate.size += bundleGraph.getTotalSize(asset);
        } else {
          candidateBundles.set(id, {
            assets: [asset],
            sourceBundles: new Set(containingBundles),
            size: bundleGraph.getTotalSize(asset)
          });
        } // Skip children from consideration since we added a parent already.


        actions.skipChildren();
      }
    }); // Sort candidates by size (consider larger bundles first), and ensure they meet the size threshold

    let sortedCandidates = Array.from(candidateBundles.values()).filter(bundle => bundle.size >= config.minBundleSize).sort((a, b) => b.size - a.size);

    for (let {
      assets,
      sourceBundles
    } of sortedCandidates) {
      let eligibleSourceBundles = new Set();

      for (let bundle of sourceBundles) {
        // Find all bundle groups connected to the original bundles
        let bundleGroups = bundleGraph.getBundleGroupsContainingBundle(bundle); // Check if all bundle groups are within the parallel request limit

        if (bundleGroups.every(group => bundleGraph.getBundlesInBundleGroup(group).length < config.maxParallelRequests)) {
          eligibleSourceBundles.add(bundle);
        }
      } // Do not create a shared bundle unless there are at least 2 source bundles


      if (eligibleSourceBundles.size < 2) {
        continue;
      }

      let [firstBundle] = [...eligibleSourceBundles];
      let sharedBundle = bundleGraph.createBundle({
        uniqueKey: (0, _hash().hashString)([...eligibleSourceBundles].map(b => b.id).join(':')),
        // Allow this bundle to be deduplicated. It shouldn't be further split.
        // TODO: Reconsider bundle/asset flags.
        isSplittable: true,
        env: firstBundle.env,
        target: firstBundle.target,
        type: firstBundle.type
      }); // Remove all of the root assets from each of the original bundles
      // and reference the new shared bundle.

      for (let asset of assets) {
        bundleGraph.addAssetGraphToBundle(asset, sharedBundle);

        for (let bundle of eligibleSourceBundles) {
          {
            bundleGraph.createBundleReference(bundle, sharedBundle);
            bundleGraph.removeAssetGraphFromBundle(asset, bundle);
          }
        }
      }
    } // Remove assets that are duplicated between shared bundles.


    deduplicate(bundleGraph);
    internalizeReachableAsyncDependencies(bundleGraph);
  }

});

exports.default = _default;

function deduplicate(bundleGraph) {
  bundleGraph.traverse(node => {
    if (node.type === 'asset') {
      let asset = node.value; // Search in reverse order, so bundles that are loaded keep the duplicated asset, not later ones.
      // This ensures that the earlier bundle is able to execute before the later one.

      let bundles = bundleGraph.getBundlesWithAsset(asset).reverse();

      for (let bundle of bundles) {
        if (bundle.hasAsset(asset) && bundleGraph.isAssetReachableFromBundle(asset, bundle)) {
          bundleGraph.removeAssetGraphFromBundle(asset, bundle);
        }
      }
    }
  });
}

const CONFIG_SCHEMA = {
  type: 'object',
  properties: {
    http: {
      type: 'number',
      enum: Object.keys(HTTP_OPTIONS).map(k => Number(k))
    },
    minBundles: {
      type: 'number'
    },
    minBundleSize: {
      type: 'number'
    },
    maxParallelRequests: {
      type: 'number'
    }
  },
  additionalProperties: false
};

async function loadBundlerConfig(config, options) {
  var _conf$contents$http, _conf$contents$minBun, _conf$contents$minBun2, _conf$contents$maxPar;

  let conf = await config.getConfig([], {
    packageKey: '@parcel/bundler-default'
  });

  if (!conf) {
    return HTTP_OPTIONS['2'];
  }

  (0, _assert().default)((conf === null || conf === void 0 ? void 0 : conf.contents) != null);

  _utils().validateSchema.diagnostic(CONFIG_SCHEMA, {
    data: conf === null || conf === void 0 ? void 0 : conf.contents,
    source: await options.inputFS.readFile(conf.filePath, 'utf8'),
    filePath: conf.filePath,
    prependKey: `/${(0, _diagnostic().encodeJSONKeyComponent)('@parcel/bundler-default')}`
  }, '@parcel/bundler-default', 'Invalid config for @parcel/bundler-default');

  let http = (_conf$contents$http = conf.contents.http) !== null && _conf$contents$http !== void 0 ? _conf$contents$http : 2;
  let defaults = HTTP_OPTIONS[http];
  return {
    minBundles: (_conf$contents$minBun = conf.contents.minBundles) !== null && _conf$contents$minBun !== void 0 ? _conf$contents$minBun : defaults.minBundles,
    minBundleSize: (_conf$contents$minBun2 = conf.contents.minBundleSize) !== null && _conf$contents$minBun2 !== void 0 ? _conf$contents$minBun2 : defaults.minBundleSize,
    maxParallelRequests: (_conf$contents$maxPar = conf.contents.maxParallelRequests) !== null && _conf$contents$maxPar !== void 0 ? _conf$contents$maxPar : defaults.maxParallelRequests
  };
}

function internalizeReachableAsyncDependencies(bundleGraph) {
  // Mark async dependencies on assets that are already available in
  // the bundle as internally resolvable. This removes the dependency between
  // the bundle and the bundle group providing that asset. If all connections
  // to that bundle group are removed, remove that bundle group.
  let asyncBundleGroups = new Set();
  bundleGraph.traverse((node, _, actions) => {
    if (node.type !== 'dependency' || node.value.isEntry || node.value.priority !== 'lazy') {
      return;
    }

    if (bundleGraph.isDependencySkipped(node.value)) {
      actions.skipChildren();
      return;
    }

    let dependency = node.value;

    if (dependency.specifierType === 'url') {
      // Don't internalize dependencies on URLs, e.g. `new Worker('foo.js')`
      return;
    }

    let resolution = bundleGraph.getResolvedAsset(dependency);

    if (resolution == null) {
      return;
    }

    let externalResolution = bundleGraph.resolveAsyncDependency(dependency);

    if ((externalResolution === null || externalResolution === void 0 ? void 0 : externalResolution.type) === 'bundle_group') {
      asyncBundleGroups.add(externalResolution.value);
    }

    for (let bundle of bundleGraph.getBundlesWithDependency(dependency)) {
      if (bundle.hasAsset(resolution) || bundleGraph.isAssetReachableFromBundle(resolution, bundle)) {
        bundleGraph.internalizeAsyncDependency(bundle, dependency);
      }
    }
  }); // Remove any bundle groups that no longer have any parent bundles.

  for (let bundleGroup of asyncBundleGroups) {
    if (bundleGraph.getParentBundlesOfBundleGroup(bundleGroup).length === 0) {
      bundleGraph.removeBundleGroup(bundleGroup);
    }
  }
}