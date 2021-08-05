'use strict';

const { visit } = require('../xast.js');

/**
 * Plugins engine.
 *
 * @module plugins
 *
 * @param {Object} data input data
 * @param {Object} info extra information
 * @param {Array} plugins plugins object from config
 * @return {Object} output data
 */
module.exports = function (data, info, plugins) {
  // Try to group sequential elements of plugins array
  // to optimize ast traversing
  const groups = [];
  let prev;
  for (const plugin of plugins) {
    if (prev && plugin.type == prev[0].type) {
      prev.push(plugin);
    } else {
      prev = [plugin];
      groups.push(prev);
    }
  }
  for (const group of groups) {
    switch (group[0].type) {
      case 'perItem':
        data = perItem(data, info, group);
        break;
      case 'perItemReverse':
        data = perItem(data, info, group, true);
        break;
      case 'full':
        data = full(data, info, group);
        break;
      case 'visitor':
        for (const plugin of group) {
          if (plugin.active) {
            const visitor = plugin.fn(data, plugin.params, info);
            visit(data, visitor);
          }
        }
        break;
    }
  }
  return data;
};

/**
 * Direct or reverse per-item loop.
 *
 * @param {Object} data input data
 * @param {Object} info extra information
 * @param {Array} plugins plugins list to process
 * @param {boolean} [reverse] reverse pass?
 * @return {Object} output data
 */
function perItem(data, info, plugins, reverse) {
  function monkeys(items) {
    items.children = items.children.filter(function (item) {
      // reverse pass
      if (reverse && item.children) {
        monkeys(item);
      }

      // main filter
      var filter = true;

      for (var i = 0; filter && i < plugins.length; i++) {
        var plugin = plugins[i];

        if (plugin.active && plugin.fn(item, plugin.params, info) === false) {
          filter = false;
        }
      }

      // direct pass
      if (!reverse && item.children) {
        monkeys(item);
      }

      return filter;
    });

    return items;
  }

  return monkeys(data);
}

/**
 * "Full" plugins.
 *
 * @param {Object} data input data
 * @param {Object} info extra information
 * @param {Array} plugins plugins list to process
 * @return {Object} output data
 */
function full(data, info, plugins) {
  plugins.forEach(function (plugin) {
    if (plugin.active) {
      data = plugin.fn(data, plugin.params, info);
    }
  });

  return data;
}
