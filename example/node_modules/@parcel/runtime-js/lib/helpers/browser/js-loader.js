"use strict";

var cacheLoader = require('../cacheLoader');

module.exports = cacheLoader(function (bundle) {
  return new Promise(function (resolve, reject) {
    // Don't insert the same script twice (e.g. if it was already in the HTML)
    var existingScripts = document.getElementsByTagName('script');

    if ([].concat(existingScripts).some(function isCurrentBundle(script) {
      return script.src === bundle;
    })) {
      resolve();
      return;
    }

    var script = document.createElement('script');
    script.async = true;
    script.type = 'text/javascript';
    script.charset = 'utf-8';
    script.src = bundle;

    script.onerror = function (e) {
      script.onerror = script.onload = null;
      script.remove();
      reject(e);
    };

    script.onload = function () {
      script.onerror = script.onload = null;
      resolve();
    };

    document.getElementsByTagName('head')[0].appendChild(script);
  });
});