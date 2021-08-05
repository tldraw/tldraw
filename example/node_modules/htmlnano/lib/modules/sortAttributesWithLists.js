"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = collapseAttributeWhitespace;

var _timsort = require("timsort");

var _collapseAttributeWhitespace = require("./collapseAttributeWhitespace");

// class, rel, ping
const validOptions = new Set(['frequency', 'alphabetical']);

const processModuleOptions = options => {
  if (options === true) return 'alphabetical';
  return validOptions.has(options) ? options : false;
};

class AttributeTokenChain {
  constructor() {
    this.freqData = new Map(); // <attrValue, frequency>[]
  }

  addFromNodeAttrsArray(attrValuesArray) {
    attrValuesArray.forEach(attrValue => {
      if (this.freqData.has(attrValue)) {
        this.freqData.set(attrValue, this.freqData.get(attrValue) + 1);
      } else {
        this.freqData.set(attrValue, 1);
      }
    });
  }

  createSortOrder() {
    let _sortOrder = [...this.freqData.entries()];
    (0, _timsort.sort)(_sortOrder, (a, b) => b[1] - a[1]);
    this.sortOrder = _sortOrder.map(i => i[0]);
  }

  sortFromNodeAttrsArray(attrValuesArray) {
    const resultArray = [];

    if (!this.sortOrder) {
      this.createSortOrder();
    }

    this.sortOrder.forEach(k => {
      if (attrValuesArray.includes(k)) {
        resultArray.push(k);
      }
    });
    return resultArray;
  }

}
/** Sort values inside list-like attributes (e.g. class, rel) */


function collapseAttributeWhitespace(tree, options, moduleOptions) {
  const sortType = processModuleOptions(moduleOptions);

  if (sortType === 'alphabetical') {
    return sortAttributesWithListsInAlphabeticalOrder(tree);
  }

  if (sortType === 'frequency') {
    return sortAttributesWithListsByFrequency(tree);
  } // Invalid configuration


  return tree;
}

function sortAttributesWithListsInAlphabeticalOrder(tree) {
  tree.walk(node => {
    if (!node.attrs) {
      return node;
    }

    Object.keys(node.attrs).forEach(attrName => {
      const attrNameLower = attrName.toLowerCase();

      if (!_collapseAttributeWhitespace.attributesWithLists.has(attrNameLower)) {
        return;
      }

      const attrValues = node.attrs[attrName].split(/\s/);
      node.attrs[attrName] = attrValues.sort((a, b) => {
        return typeof a.localeCompare === 'function' ? a.localeCompare(b) : a - b;
      }).join(' ');
    });
    return node;
  });
  return tree;
}

function sortAttributesWithListsByFrequency(tree) {
  const tokenChainObj = {}; // <attrNameLower: AttributeTokenChain>[]
  // Traverse through tree to get frequency

  tree.walk(node => {
    if (!node.attrs) {
      return node;
    }

    Object.entries(node.attrs).forEach(([attrName, attrValues]) => {
      const attrNameLower = attrName.toLowerCase();

      if (!_collapseAttributeWhitespace.attributesWithLists.has(attrNameLower)) {
        return;
      }

      tokenChainObj[attrNameLower] = tokenChainObj[attrNameLower] || new AttributeTokenChain();
      tokenChainObj[attrNameLower].addFromNodeAttrsArray(attrValues.split(/\s/));
    });
    return node;
  }); // Traverse through tree again, this time sort the attribute values

  tree.walk(node => {
    if (!node.attrs) {
      return node;
    }

    Object.entries(node.attrs).forEach(([attrName, attrValues]) => {
      const attrNameLower = attrName.toLowerCase();

      if (!_collapseAttributeWhitespace.attributesWithLists.has(attrNameLower)) {
        return;
      }

      if (tokenChainObj[attrNameLower]) {
        node.attrs[attrName] = tokenChainObj[attrNameLower].sortFromNodeAttrsArray(attrValues.split(/\s/)).join(' ');
      }
    });
    return node;
  });
}