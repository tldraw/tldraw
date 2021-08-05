"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = sortAttributes;

var _timsort = require("timsort");

const validOptions = new Set(['frequency', 'alphabetical']);

const processModuleOptions = options => {
  if (options === true) return 'alphabetical';
  return validOptions.has(options) ? options : false;
};

class AttributeTokenChain {
  constructor() {
    this.freqData = new Map(); // <attr, frequency>[]
  }

  addFromNodeAttrs(nodeAttrs) {
    Object.keys(nodeAttrs).forEach(attrName => {
      const attrNameLower = attrName.toLowerCase();

      if (this.freqData.has(attrNameLower)) {
        this.freqData.set(attrNameLower, this.freqData.get(attrNameLower) + 1);
      } else {
        this.freqData.set(attrNameLower, 1);
      }
    });
  }

  createSortOrder() {
    let _sortOrder = [...this.freqData.entries()];
    (0, _timsort.sort)(_sortOrder, (a, b) => b[1] - a[1]);
    this.sortOrder = _sortOrder.map(i => i[0]);
  }

  sortFromNodeAttrs(nodeAttrs) {
    const newAttrs = {}; // Convert node.attrs attrName into lower case.

    const loweredNodeAttrs = {};
    Object.entries(nodeAttrs).forEach(([attrName, attrValue]) => {
      loweredNodeAttrs[attrName.toLowerCase()] = attrValue;
    });

    if (!this.sortOrder) {
      this.createSortOrder();
    }

    this.sortOrder.forEach(attrNameLower => {
      // The attrName inside "sortOrder" has been lowered
      if (loweredNodeAttrs[attrNameLower]) {
        newAttrs[attrNameLower] = loweredNodeAttrs[attrNameLower];
      }
    });
    return newAttrs;
  }

}
/** Sort attibutes */


function sortAttributes(tree, options, moduleOptions) {
  const sortType = processModuleOptions(moduleOptions);

  if (sortType === 'alphabetical') {
    return sortAttributesInAlphabeticalOrder(tree);
  }

  if (sortType === 'frequency') {
    return sortAttributesByFrequency(tree);
  } // Invalid configuration


  return tree;
}

function sortAttributesInAlphabeticalOrder(tree) {
  tree.walk(node => {
    if (!node.attrs) {
      return node;
    }

    const newAttrs = {};
    Object.keys(node.attrs).sort((a, b) => typeof a.localeCompare === 'function' ? a.localeCompare(b) : a - b).forEach(attr => newAttrs[attr] = node.attrs[attr]);
    node.attrs = newAttrs;
    return node;
  });
  return tree;
}

function sortAttributesByFrequency(tree) {
  const tokenchain = new AttributeTokenChain(); // Traverse through tree to get frequency

  tree.walk(node => {
    if (!node.attrs) {
      return node;
    }

    tokenchain.addFromNodeAttrs(node.attrs);
    return node;
  }); // Traverse through tree again, this time sort the attributes

  tree.walk(node => {
    if (!node.attrs) {
      return node;
    }

    node.attrs = tokenchain.sortFromNodeAttrs(node.attrs);
    return node;
  });
  return tree;
}