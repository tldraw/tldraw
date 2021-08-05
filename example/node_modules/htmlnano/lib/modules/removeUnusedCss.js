"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = removeUnusedCss;

var _helpers = require("../helpers");

var _uncss = _interopRequireDefault(require("uncss"));

var _purgecss = _interopRequireDefault(require("purgecss"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// These options must be set and shouldn't be overriden to ensure uncss doesn't look at linked stylesheets.
const uncssOptions = {
  ignoreSheets: [/\s*/],
  stylesheets: []
};

function processStyleNodeUnCSS(html, styleNode, uncssOptions) {
  const css = (0, _helpers.extractCssFromStyleNode)(styleNode);
  return runUncss(html, css, uncssOptions).then(css => {
    // uncss may have left some style tags empty
    if (css.trim().length === 0) {
      styleNode.tag = false;
      styleNode.content = [];
      return;
    }

    styleNode.content = [css];
  });
}

function runUncss(html, css, userOptions) {
  if (typeof userOptions !== 'object') {
    userOptions = {};
  }

  const options = { ...userOptions,
    ...uncssOptions
  };
  return new Promise((resolve, reject) => {
    options.raw = css;
    (0, _uncss.default)(html, options, (error, output) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(output);
    });
  });
}

const purgeFromHtml = function (tree) {
  // content is not used as we can directly used the parsed HTML,
  // making the process faster
  const selectors = [];
  tree.walk(node => {
    const classes = node.attrs && node.attrs.class && node.attrs.class.split(' ') || [];
    const ids = node.attrs && node.attrs.id && node.attrs.id.split(' ') || [];
    selectors.push(...classes, ...ids);
    node.tag && selectors.push(node.tag);
    return node;
  });
  return () => selectors;
};

function processStyleNodePurgeCSS(tree, styleNode, purgecssOptions) {
  const css = (0, _helpers.extractCssFromStyleNode)(styleNode);
  return runPurgecss(tree, css, purgecssOptions).then(css => {
    if (css.trim().length === 0) {
      styleNode.tag = false;
      styleNode.content = [];
      return;
    }

    styleNode.content = [css];
  });
}

function runPurgecss(tree, css, userOptions) {
  if (typeof userOptions !== 'object') {
    userOptions = {};
  }

  const options = { ...userOptions,
    content: [{
      raw: tree,
      extension: 'html'
    }],
    css: [{
      raw: css,
      extension: 'css'
    }],
    extractors: [{
      extractor: purgeFromHtml(tree),
      extensions: ['html']
    }]
  };
  return new _purgecss.default().purge(options).then(result => {
    return result[0].css;
  });
}
/** Remove unused CSS */


function removeUnusedCss(tree, options, userOptions) {
  const promises = [];
  const html = userOptions.tool !== 'purgeCSS' && tree.render(tree);
  tree.walk(node => {
    if ((0, _helpers.isStyleNode)(node)) {
      if (userOptions.tool === 'purgeCSS') {
        promises.push(processStyleNodePurgeCSS(tree, node, userOptions));
      } else {
        promises.push(processStyleNodeUnCSS(html, node, userOptions));
      }
    }

    return node;
  });
  return Promise.all(promises).then(() => tree);
}