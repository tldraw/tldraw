"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.remapAstLocations = remapAstLocations;
exports.parse = parse;
exports.generateAST = generateAST;
exports.generate = generate;
exports.convertBabelLoc = convertBabelLoc;
Object.defineProperty(exports, "babelErrorEnhancer", {
  enumerable: true,
  get: function () {
    return _babelErrorUtils.babelErrorEnhancer;
  }
});

function _path() {
  const data = _interopRequireDefault(require("path"));

  _path = function () {
    return data;
  };

  return data;
}

function _parser() {
  const data = require("@babel/parser");

  _parser = function () {
    return data;
  };

  return data;
}

function _sourceMap() {
  const data = _interopRequireDefault(require("@parcel/source-map"));

  _sourceMap = function () {
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

function _babylonWalk() {
  const data = require("@parcel/babylon-walk");

  _babylonWalk = function () {
    return data;
  };

  return data;
}

var _babelErrorUtils = require("./babelErrorUtils");

function _astring() {
  const data = require("astring");

  _astring = function () {
    return data;
  };

  return data;
}

var _generator = require("./generator");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// $FlowFixMe
// $FlowFixMe
function remapAstLocations(ast, map) {
  // remap ast to original mappings
  // This improves sourcemap accuracy and fixes sourcemaps when scope-hoisting
  (0, _babylonWalk().traverseAll)(ast.program, node => {
    if (node.loc) {
      var _node$loc;

      if ((_node$loc = node.loc) !== null && _node$loc !== void 0 && _node$loc.start) {
        let mapping = map.findClosestMapping(node.loc.start.line, node.loc.start.column);

        if (mapping !== null && mapping !== void 0 && mapping.original) {
          // $FlowFixMe
          node.loc.start.line = mapping.original.line; // $FlowFixMe

          node.loc.start.column = mapping.original.column; // $FlowFixMe

          let length = node.loc.end.column - node.loc.start.column; // $FlowFixMe

          node.loc.end.line = mapping.original.line; // $FlowFixMe

          node.loc.end.column = mapping.original.column + length; // $FlowFixMe

          node.loc.filename = mapping.source;
        } else {
          // Maintain null mappings?
          node.loc = null;
        }
      }
    }
  });
}

async function parse({
  asset,
  code,
  options
}) {
  try {
    let program = (0, _parser().parse)(code, {
      sourceFilename: (0, _utils().relativeUrl)(options.projectRoot, asset.filePath),
      allowReturnOutsideFunction: true,
      strictMode: false,
      sourceType: 'module'
    });
    let map = await asset.getMap();

    if (map) {
      remapAstLocations(program, map);
    }

    return {
      type: 'babel',
      version: '7.0.0',
      program
    };
  } catch (e) {
    throw await (0, _babelErrorUtils.babelErrorEnhancer)(e, asset);
  }
} // astring is ~50x faster than @babel/generator. We use it with a custom
// generator to handle the Babel AST differences from ESTree.


function generateAST({
  ast,
  sourceFileName,
  sourceMaps,
  options
}) {
  let map = new (_sourceMap().default)(options.projectRoot);
  let mappings = [];
  let generated = (0, _astring().generate)(ast.program, {
    generator: _generator.generator,
    expressionsPrecedence: _generator.expressionsPrecedence,
    comments: true,
    sourceMap: sourceMaps ? {
      file: sourceFileName,

      addMapping(mapping) {
        // Copy the object because astring mutates it
        mappings.push({
          original: mapping.original,
          generated: {
            line: mapping.generated.line,
            column: mapping.generated.column
          },
          name: mapping.name,
          source: mapping.source
        });
      }

    } : null
  });
  map.addIndexedMappings(mappings);
  return {
    content: generated,
    map
  };
}

async function generate({
  asset,
  ast,
  options
}) {
  let sourceFileName = (0, _utils().relativeUrl)(options.projectRoot, asset.filePath);
  let {
    content,
    map
  } = generateAST({
    ast: ast.program,
    sourceFileName,
    sourceMaps: !!asset.env.sourceMap,
    options
  });
  let originalSourceMap = await asset.getMap();

  if (originalSourceMap) {
    // The babel AST already contains the correct mappings, but not the source contents.
    // We need to copy over the source contents from the original map.
    let sourcesContent = originalSourceMap.getSourcesContentMap();

    for (let filePath in sourcesContent) {
      let content = sourcesContent[filePath];

      if (content != null) {
        map.setSourceContent(filePath, content);
      }
    }
  }

  return {
    content,
    map
  };
}

function convertBabelLoc(options, loc) {
  if (!loc) return null;
  let {
    filename,
    start,
    end
  } = loc;
  if (filename == null) return null;
  return {
    filePath: _path().default.resolve(options.projectRoot, filename),
    start: {
      line: start.line,
      column: start.column + 1
    },
    // - Babel's columns are exclusive, ours are inclusive (column - 1)
    // - Babel has 0-based columns, ours are 1-based (column + 1)
    // = +-0
    end: {
      line: end.line,
      column: end.column
    }
  };
}