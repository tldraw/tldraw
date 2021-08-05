"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = bundleReport;

function _utils() {
  const data = require("@parcel/utils");

  _utils = function () {
    return data;
  };

  return data;
}

function _filesize() {
  const data = _interopRequireDefault(require("filesize"));

  _filesize = function () {
    return data;
  };

  return data;
}

function _chalk() {
  const data = _interopRequireDefault(require("chalk"));

  _chalk = function () {
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

var emoji = _interopRequireWildcard(require("./emoji"));

var _render = require("./render");

var _utils2 = require("./utils");

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const LARGE_BUNDLE_SIZE = 1024 * 1024;
const COLUMNS = [{
  align: 'left'
}, // name
{
  align: 'right'
}, // size
{
  align: 'right'
} // time
];

async function bundleReport(bundleGraph, fs, projectRoot, assetCount = 0) {
  let bundleList = bundleGraph.getBundles(); // Get a list of bundles sorted by size

  let {
    bundles
  } = assetCount > 0 ? await (0, _utils().generateBuildMetrics)(bundleList, fs, projectRoot) : {
    bundles: bundleList.map(b => {
      return {
        filePath: (0, _nullthrows().default)(b.filePath),
        size: b.stats.size,
        time: b.stats.time,
        assets: []
      };
    })
  };
  let rows = [];

  for (let bundle of bundles) {
    // Add a row for the bundle
    rows.push([(0, _utils2.formatFilename)(bundle.filePath || '', _chalk().default.cyan.bold), _chalk().default.bold(prettifySize(bundle.size, bundle.size > LARGE_BUNDLE_SIZE)), _chalk().default.green.bold((0, _utils().prettifyTime)(bundle.time))]);

    if (assetCount > 0) {
      let largestAssets = bundle.assets.slice(0, assetCount);

      for (let asset of largestAssets) {
        let columns = [asset == largestAssets[largestAssets.length - 1] ? '└── ' : '├── ', _chalk().default.dim(prettifySize(asset.size)), _chalk().default.dim(_chalk().default.green((0, _utils().prettifyTime)(asset.time)))];

        if (asset.filePath !== '') {
          columns[0] += (0, _utils2.formatFilename)(asset.filePath, _chalk().default.reset);
        } else {
          columns[0] += 'Code from unknown sourcefiles';
        } // Add a row for the asset.


        rows.push(columns);
      }

      if (bundle.assets.length > largestAssets.length) {
        rows.push(['└── ' + _chalk().default.dim(`+ ${bundle.assets.length - largestAssets.length} more assets`)]);
      } // If this isn't the last bundle, add an empty row before the next one


      if (bundle !== bundles[bundles.length - 1]) {
        rows.push([]);
      }
    }
  } // Render table


  (0, _render.writeOut)('');
  (0, _render.table)(COLUMNS, rows);
}

function prettifySize(size, isLarge) {
  let res = (0, _filesize().default)(size);

  if (isLarge) {
    return _chalk().default.yellow(emoji.warning + '  ' + res);
  }

  return _chalk().default.magenta(res);
}