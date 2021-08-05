'use strict';

const { closestByName } = require('../lib/xast.js');

exports.type = 'perItem';

exports.active = false;

exports.description = 'adds attributes to an outer <svg> element';

var ENOCLS = `Error in plugin "addAttributesToSVGElement": absent parameters.
It should have a list of "attributes" or one "attribute".
Config example:

plugins: [
  {
    name: 'addAttributesToSVGElement',
    params: {
      attribute: "mySvg"
    }
  }
]

plugins: [
  {
    name: 'addAttributesToSVGElement',
    params: {
      attributes: ["mySvg", "size-big"]
    }
  }
]

plugins: [
  {
    name: 'addAttributesToSVGElement',
    params: {
      attributes: [
        {
          focusable: false
        },
        {
          'data-image': icon
        }
      ]
    }
  }
]
`;

/**
 * Add attributes to an outer <svg> element. Example config:
 *
 * @author April Arcus
 */
exports.fn = (node, params) => {
  if (
    node.type === 'element' &&
    node.name === 'svg' &&
    closestByName(node.parentNode, 'svg') == null
  ) {
    if (!params || !(Array.isArray(params.attributes) || params.attribute)) {
      console.error(ENOCLS);
      return;
    }

    const attributes = params.attributes || [params.attribute];

    for (const attribute of attributes) {
      if (typeof attribute === 'string') {
        if (node.attributes[attribute] == null) {
          node.attributes[attribute] = undefined;
        }
      }
      if (typeof attribute === 'object') {
        for (const key of Object.keys(attribute)) {
          if (node.attributes[key] == null) {
            node.attributes[key] = attribute[key];
          }
        }
      }
    }
  }
};
