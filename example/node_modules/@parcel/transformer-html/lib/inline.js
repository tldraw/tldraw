"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = extractInlineAssets;

function _hash() {
  const data = require("@parcel/hash");

  _hash = function () {
    return data;
  };

  return data;
}

function _posthtml() {
  const data = _interopRequireDefault(require("posthtml"));

  _posthtml = function () {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const SCRIPT_TYPES = {
  'application/javascript': 'js',
  'text/javascript': 'js',
  'application/json': false,
  'application/ld+json': 'jsonld',
  'text/html': false,
  module: 'js'
};

function extractInlineAssets(asset, ast) {
  let program = ast.program;
  let key = 0; // Extract inline <script> and <style> tags for processing.

  let parts = [];
  let hasScripts = false;
  (0, _posthtml().default)().walk.call(program, node => {
    let parcelKey = (0, _hash().hashString)(`${asset.id}:${key++}`);

    if (node.tag === 'script' || node.tag === 'style') {
      let value = node.content && node.content.join('');

      if (value != null) {
        var _node$attrs, _node$location;

        let type, env;

        if (node.tag === 'style') {
          if (node.attrs && node.attrs.type != null) {
            type = node.attrs.type.split('/')[1];
          } else {
            type = 'css';
          }
        } else if (node.attrs && node.attrs.type != null) {
          // Skip JSON
          if (SCRIPT_TYPES[node.attrs.type] === false) {
            return node;
          }

          if (SCRIPT_TYPES[node.attrs.type]) {
            type = SCRIPT_TYPES[node.attrs.type];
          } else {
            type = node.attrs.type.split('/')[1];
          }

          let outputFormat = 'global';
          let sourceType = 'script';

          if (node.attrs.type === 'module') {
            if (asset.env.shouldScopeHoist && asset.env.supports('esmodules', true)) {
              outputFormat = 'esmodule';
            } else {
              delete node.attrs.type;
            }

            sourceType = 'module';
          }

          let loc = node.location ? {
            filePath: asset.filePath,
            start: node.location.start,
            end: node.location.end
          } : undefined;
          env = {
            sourceType,
            outputFormat,
            loc
          };
        } else {
          let loc = node.location ? {
            filePath: asset.filePath,
            start: node.location.start,
            end: node.location.end
          } : undefined;
          type = 'js';
          env = {
            sourceType: 'script',
            loc
          };
        }

        if (!type) {
          return node;
        }

        if (!node.attrs) {
          node.attrs = {};
        } // allow a script/style tag to declare its key


        if (node.attrs['data-parcel-key']) {
          parcelKey = node.attrs['data-parcel-key'];
        } // Inform packager to remove type, since CSS and JS are the defaults.


        if ((_node$attrs = node.attrs) !== null && _node$attrs !== void 0 && _node$attrs.type && node.tag === 'style') {
          delete node.attrs.type;
        } // insert parcelId to allow us to retrieve node during packaging


        node.attrs['data-parcel-key'] = parcelKey;
        asset.setAST(ast); // mark dirty

        asset.addDependency({
          specifier: parcelKey,
          specifierType: 'esm'
        });
        parts.push({
          type,
          content: value,
          uniqueKey: parcelKey,
          bundleBehavior: 'inline',
          env,
          meta: {
            type: 'tag',
            // $FlowFixMe
            node,
            startLine: (_node$location = node.location) === null || _node$location === void 0 ? void 0 : _node$location.start.line
          }
        });

        if (type === 'js') {
          hasScripts = true;
        }
      }
    } // Process inline style attributes.


    let attrs = node.attrs;
    let style = attrs === null || attrs === void 0 ? void 0 : attrs.style;

    if (attrs != null && style != null) {
      attrs.style = asset.addDependency({
        specifier: parcelKey,
        specifierType: 'esm'
      });
      asset.setAST(ast); // mark dirty

      parts.push({
        type: 'css',
        content: style,
        uniqueKey: parcelKey,
        bundleBehavior: 'inline',
        meta: {
          type: 'attr',
          // $FlowFixMe
          node
        }
      });
    }

    return node;
  });
  return {
    assets: parts,
    hasScripts
  };
}