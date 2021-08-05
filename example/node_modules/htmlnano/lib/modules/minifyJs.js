"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = minifyJs;

var _terser = _interopRequireDefault(require("terser"));

var _removeRedundantAttributes = require("./removeRedundantAttributes");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/** Minify JS with Terser */
function minifyJs(tree, options, terserOptions) {
  let promises = [];
  tree.walk(node => {
    if (node.tag && node.tag === 'script') {
      const nodeAttrs = node.attrs || {};
      const mimeType = nodeAttrs.type || 'text/javascript';

      if (_removeRedundantAttributes.redundantScriptTypes.has(mimeType) || mimeType === 'module') {
        promises.push(processScriptNode(node, terserOptions));
      }
    }

    if (node.attrs) {
      promises = promises.concat(processNodeWithOnAttrs(node, terserOptions));
    }

    return node;
  });
  return Promise.all(promises).then(() => tree);
}

function stripCdata(js) {
  const leftStrippedJs = js.replace(/\/\/\s*<!\[CDATA\[/, '').replace(/\/\*\s*<!\[CDATA\[\s*\*\//, '');

  if (leftStrippedJs === js) {
    return js;
  }

  const strippedJs = leftStrippedJs.replace(/\/\/\s*\]\]>/, '').replace(/\/\*\s*\]\]>\s*\*\//, '');
  return leftStrippedJs === strippedJs ? js : strippedJs;
}

function processScriptNode(scriptNode, terserOptions) {
  let js = (scriptNode.content || []).join('').trim();

  if (!js) {
    return scriptNode;
  } // Improve performance by avoiding calling stripCdata again and again


  let isCdataWrapped = false;

  if (js.includes('CDATA')) {
    const strippedJs = stripCdata(js);
    isCdataWrapped = js !== strippedJs;
    js = strippedJs;
  }

  return _terser.default.minify(js, terserOptions).then(result => {
    if (result.error) {
      throw new Error(result.error);
    }

    if (result.code === undefined) {
      return;
    }

    let content = result.code;

    if (isCdataWrapped) {
      content = '/*<![CDATA[*/' + content + '/*]]>*/';
    }

    scriptNode.content = [content];
  });
}

function processNodeWithOnAttrs(node, terserOptions) {
  const jsWrapperStart = 'function _(){';
  const jsWrapperEnd = '}';
  const promises = [];

  for (const attrName of Object.keys(node.attrs || {})) {
    if (!attrName.startsWith('on')) {
      continue;
    } // For example onclick="return false" is valid,
    // but "return false;" is invalid (error: 'return' outside of function)
    // Therefore the attribute's code should be wrapped inside function:
    // "function _(){return false;}"


    let wrappedJs = jsWrapperStart + node.attrs[attrName] + jsWrapperEnd;

    let promise = _terser.default.minify(wrappedJs, terserOptions).then(({
      code
    }) => {
      let minifiedJs = code.substring(jsWrapperStart.length, code.length - jsWrapperEnd.length);
      node.attrs[attrName] = minifiedJs;
    });

    promises.push(promise);
  }

  return promises;
}