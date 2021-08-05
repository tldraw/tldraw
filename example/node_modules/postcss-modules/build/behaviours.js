"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.behaviours = undefined;
exports.getDefaultPlugins = getDefaultPlugins;
exports.isValidBehaviour = isValidBehaviour;

var _postcssModulesLocalByDefault = require("postcss-modules-local-by-default");

var _postcssModulesLocalByDefault2 = _interopRequireDefault(_postcssModulesLocalByDefault);

var _postcssModulesExtractImports = require("postcss-modules-extract-imports");

var _postcssModulesExtractImports2 = _interopRequireDefault(_postcssModulesExtractImports);

var _postcssModulesScope = require("postcss-modules-scope");

var _postcssModulesScope2 = _interopRequireDefault(_postcssModulesScope);

var _postcssModulesValues = require("postcss-modules-values");

var _postcssModulesValues2 = _interopRequireDefault(_postcssModulesValues);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const behaviours = exports.behaviours = {
  LOCAL: "local",
  GLOBAL: "global"
};

function getDefaultPlugins({
  behaviour,
  generateScopedName,
  exportGlobals
}) {
  const scope = (0, _postcssModulesScope2.default)({ generateScopedName, exportGlobals });

  const plugins = {
    [behaviours.LOCAL]: [_postcssModulesValues2.default, _postcssModulesLocalByDefault2.default, _postcssModulesExtractImports2.default, scope],
    [behaviours.GLOBAL]: [_postcssModulesValues2.default, _postcssModulesExtractImports2.default, scope]
  };

  return plugins[behaviour];
}

function isValidBehaviour(behaviour) {
  return Object.keys(behaviours).map(key => behaviours[key]).indexOf(behaviour) > -1;
}