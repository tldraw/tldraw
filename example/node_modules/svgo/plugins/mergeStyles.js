'use strict';

const { closestByName, detachNodeFromParent } = require('../lib/xast.js');
const JSAPI = require('../lib/svgo/jsAPI.js');

exports.type = 'visitor';
exports.active = true;
exports.description = 'merge multiple style elements into one';

/**
 * Merge multiple style elements into one.
 *
 * @author strarsis <strarsis@gmail.com>
 */
exports.fn = () => {
  let firstStyleElement = null;
  let collectedStyles = '';
  let styleContentType = 'text';

  const enterElement = (node) => {
    // collect style elements
    if (node.name !== 'style') {
      return;
    }

    // skip <style> with invalid type attribute
    if (
      node.attributes.type != null &&
      node.attributes.type !== '' &&
      node.attributes.type !== 'text/css'
    ) {
      return;
    }

    // skip <foreignObject> content
    if (closestByName(node, 'foreignObject')) {
      return;
    }

    // extract style element content
    let css = '';
    for (const child of node.children) {
      if (child.type === 'text') {
        css += child.value;
      }
      if (child.type === 'cdata') {
        styleContentType = 'cdata';
        css += child.value;
      }
    }

    // remove empty style elements
    if (css.trim().length === 0) {
      detachNodeFromParent(node);
      return;
    }

    // collect css and wrap with media query if present in attribute
    if (node.attributes.media == null) {
      collectedStyles += css;
    } else {
      collectedStyles += `@media ${node.attributes.media}{${css}}`;
      delete node.attributes.media;
    }

    // combine collected styles in the first style element
    if (firstStyleElement == null) {
      firstStyleElement = node;
    } else {
      detachNodeFromParent(node);
      firstStyleElement.children = [
        new JSAPI(
          { type: styleContentType, value: collectedStyles },
          firstStyleElement
        ),
      ];
    }
  };

  return {
    element: {
      enter: enterElement,
    },
  };
};
