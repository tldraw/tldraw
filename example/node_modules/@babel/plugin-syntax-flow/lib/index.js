"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _helperPluginUtils = require("@babel/helper-plugin-utils");

var _default = (0, _helperPluginUtils.declare)((api, options) => {
  api.assertVersion(7);
  const {
    all,
    enums
  } = options;

  if (typeof all !== "boolean" && typeof all !== "undefined") {
    throw new Error(".all must be a boolean, or undefined");
  }

  if (typeof enums !== "boolean" && typeof enums !== "undefined") {
    throw new Error(".enums must be a boolean, or undefined");
  }

  return {
    name: "syntax-flow",

    manipulateOptions(opts, parserOpts) {
      if (parserOpts.plugins.some(p => (Array.isArray(p) ? p[0] : p) === "typescript")) {
        return;
      }

      parserOpts.plugins.push(["flow", {
        all,
        enums
      }]);
    }

  };
});

exports.default = _default;