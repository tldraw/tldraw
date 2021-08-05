"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getFlowOptions;

/**
 * Generates a babel config for stripping away Flow types.
 */
async function getFlowOptions(config, options) {
  if (!config.isSource) {
    return null;
  } // Only add flow plugin if `flow-bin` is listed as a dependency in the root package.json


  let conf = await config.getConfigFrom(options.projectRoot + '/index', ['package.json']);
  let pkg = conf === null || conf === void 0 ? void 0 : conf.contents;

  if (!pkg || !(pkg.dependencies && pkg.dependencies['flow-bin']) && !(pkg.devDependencies && pkg.devDependencies['flow-bin'])) {
    return null;
  }

  return {
    plugins: [['@babel/plugin-transform-flow-strip-types', {
      requireDirective: true
    }]]
  };
}