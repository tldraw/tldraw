'use strict';

const csso = require('csso');
const { traverse } = require('../lib/xast.js');

exports.type = 'full';

exports.active = true;

exports.description =
  'minifies styles and removes unused styles based on usage data';

exports.params = {
  // ... CSSO options goes here

  // additional
  usage: {
    force: false, // force to use usage data even if it unsafe (document contains <script> or on* attributes)
    ids: true,
    classes: true,
    tags: true,
  },
};

/**
 * Minifies styles (<style> element + style attribute) using CSSO
 *
 * @author strarsis <strarsis@gmail.com>
 */
exports.fn = function (ast, options) {
  options = options || {};

  var minifyOptionsForStylesheet = cloneObject(options);
  var minifyOptionsForAttribute = cloneObject(options);
  var elems = findStyleElems(ast);

  minifyOptionsForStylesheet.usage = collectUsageData(ast, options);
  minifyOptionsForAttribute.usage = null;

  elems.forEach(function (elem) {
    if (elem.isElem('style')) {
      if (
        elem.children[0].type === 'text' ||
        elem.children[0].type === 'cdata'
      ) {
        const styleCss = elem.children[0].value;
        const minified = csso.minify(styleCss, minifyOptionsForStylesheet).css;
        // preserve cdata if necessary
        // TODO split cdata -> text optimisation into separate plugin
        if (styleCss.indexOf('>') >= 0 || styleCss.indexOf('<') >= 0) {
          elem.children[0].type = 'cdata';
          elem.children[0].value = minified;
        } else {
          elem.children[0].type = 'text';
          elem.children[0].value = minified;
        }
      }
    } else {
      // style attribute
      var elemStyle = elem.attributes.style;

      elem.attributes.style = csso.minifyBlock(
        elemStyle,
        minifyOptionsForAttribute
      ).css;
    }
  });

  return ast;
};

function cloneObject(obj) {
  return { ...obj };
}

function findStyleElems(ast) {
  const nodesWithStyles = [];
  traverse(ast, (node) => {
    if (node.type === 'element') {
      if (node.name === 'style' && node.children.length !== 0) {
        nodesWithStyles.push(node);
      } else if (node.attributes.style != null) {
        nodesWithStyles.push(node);
      }
    }
  });
  return nodesWithStyles;
}

function shouldFilter(options, name) {
  if ('usage' in options === false) {
    return true;
  }

  if (options.usage && name in options.usage === false) {
    return true;
  }

  return Boolean(options.usage && options.usage[name]);
}

function collectUsageData(ast, options) {
  let safe = true;
  const usageData = {};
  let hasData = false;
  const rawData = {
    ids: Object.create(null),
    classes: Object.create(null),
    tags: Object.create(null),
  };

  traverse(ast, (node) => {
    if (node.type === 'element') {
      if (node.name === 'script') {
        safe = false;
      }

      rawData.tags[node.name] = true;

      if (node.attributes.id != null) {
        rawData.ids[node.attributes.id] = true;
      }

      if (node.attributes.class != null) {
        node.attributes.class
          .replace(/^\s+|\s+$/g, '')
          .split(/\s+/)
          .forEach((className) => {
            rawData.classes[className] = true;
          });
      }

      if (Object.keys(node.attributes).some((name) => /^on/i.test(name))) {
        safe = false;
      }
    }
  });

  if (!safe && options.usage && options.usage.force) {
    safe = true;
  }

  for (const [key, data] of Object.entries(rawData)) {
    if (shouldFilter(options, key)) {
      usageData[key] = Object.keys(data);
      hasData = true;
    }
  }

  return safe && hasData ? usageData : null;
}
