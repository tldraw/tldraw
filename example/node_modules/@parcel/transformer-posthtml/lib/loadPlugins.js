"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = loadExternalPlugins;

async function loadExternalPlugins(plugins, relative, options) {
  if (Array.isArray(plugins)) {
    return Promise.all(plugins.map(p => loadPlugin(p, relative, null, options.packageManager, options.shouldAutoInstall)).filter(Boolean));
  } else if (typeof plugins === 'object') {
    let mapPlugins = await Promise.all(Object.keys(plugins).map(p => loadPlugin(p, relative, plugins[p], options.packageManager, options.shouldAutoInstall)));
    return mapPlugins.filter(Boolean);
  } else {
    return [];
  }
}

async function loadPlugin(pluginArg, relative, options = {}, packageManager, shouldAutoInstall) {
  if (typeof pluginArg !== 'string') {
    return pluginArg;
  }

  let plugin = await packageManager.require(pluginArg, relative, {
    shouldAutoInstall
  });
  plugin = plugin.default || plugin;
  return plugin(options);
}