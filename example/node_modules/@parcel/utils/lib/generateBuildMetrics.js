"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = generateBuildMetrics;

function _sourceMap() {
  const data = _interopRequireDefault(require("@parcel/source-map"));

  _sourceMap = function () {
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

function _path() {
  const data = _interopRequireDefault(require("path"));

  _path = function () {
    return data;
  };

  return data;
}

var _ = require("./");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

async function getSourcemapSizes(filePath, fs, projectRoot) {
  let bundleContents = await fs.readFile(filePath, 'utf-8');
  let mapUrlData = await (0, _.loadSourceMapUrl)(fs, filePath, bundleContents);

  if (!mapUrlData) {
    return null;
  }

  let rawMap = mapUrlData.map;
  let sourceMap = new (_sourceMap().default)(projectRoot);
  sourceMap.addVLQMap(rawMap);
  let parsedMapData = sourceMap.getMap();

  if (parsedMapData.mappings.length > 2) {
    let sources = parsedMapData.sources.map(s => _path().default.normalize(_path().default.join(projectRoot, s)));
    let currLine = 1;
    let currColumn = 0;
    let currMappingIndex = 0;
    let currMapping = parsedMapData.mappings[currMappingIndex];
    let nextMapping = parsedMapData.mappings[currMappingIndex + 1];
    let sourceSizes = new Array(sources.length).fill(0);
    let unknownOrigin = 0;

    for (let i = 0; i < bundleContents.length; i++) {
      let character = bundleContents[i];

      while (nextMapping && nextMapping.generated.line === currLine && nextMapping.generated.column <= currColumn) {
        currMappingIndex++;
        currMapping = parsedMapData.mappings[currMappingIndex];
        nextMapping = parsedMapData.mappings[currMappingIndex + 1];
      }

      let currentSource = currMapping.source;
      let charSize = Buffer.byteLength(character, 'utf8');

      if (currentSource != null && currMapping.generated.line === currLine && currMapping.generated.column <= currColumn) {
        sourceSizes[currentSource] += charSize;
      } else {
        unknownOrigin += charSize;
      }

      if (character === '\n') {
        currColumn = 0;
        currLine++;
      } else {
        currColumn++;
      }
    }

    let sizeMap = new Map();

    for (let i = 0; i < sourceSizes.length; i++) {
      sizeMap.set(sources[i], sourceSizes[i]);
    }

    sizeMap.set('', unknownOrigin);
    return sizeMap;
  }
}

async function createBundleStats(bundle, fs, projectRoot) {
  let filePath = bundle.filePath;
  let sourcemapSizes = await getSourcemapSizes(filePath, fs, projectRoot);
  let assets = new Map();
  bundle.traverseAssets(asset => {
    let filePath = _path().default.normalize(asset.filePath);

    assets.set(filePath, {
      filePath,
      size: asset.stats.size,
      originalSize: asset.stats.size,
      time: asset.stats.time
    });
  });
  let assetsReport = [];

  if (sourcemapSizes && sourcemapSizes.size) {
    assetsReport = Array.from(sourcemapSizes.keys()).map(filePath => {
      let foundSize = sourcemapSizes.get(filePath) || 0;
      let stats = assets.get(filePath) || {
        filePath,
        size: foundSize,
        originalSize: foundSize,
        time: 0
      };
      return { ...stats,
        size: foundSize
      };
    });
  } else {
    assetsReport = Array.from(assets.values());
  }

  return {
    filePath: (0, _nullthrows().default)(bundle.filePath),
    size: bundle.stats.size,
    time: bundle.stats.time,
    assets: assetsReport.sort((a, b) => b.size - a.size)
  };
}

async function generateBuildMetrics(bundles, fs, projectRoot) {
  bundles.sort((a, b) => b.stats.size - a.stats.size).filter(b => !!b.filePath);
  return {
    bundles: (await Promise.all(bundles.map(b => createBundleStats(b, fs, projectRoot)))).filter(e => !!e)
  };
}