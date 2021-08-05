"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = custom;

/** Meta-module that runs custom modules  */
function custom(tree, options, customModules) {
  if (!customModules) {
    return tree;
  }

  if (!Array.isArray(customModules)) {
    customModules = [customModules];
  }

  customModules.forEach(customModule => {
    tree = customModule(tree, options);
  });
  return tree;
}