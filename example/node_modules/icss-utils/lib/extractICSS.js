"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
const importPattern = /^:import\(("[^"]*"|'[^']*'|[^"']+)\)$/;

const getDeclsObject = rule => {
  const object = {};
  rule.walkDecls(decl => {
    const before = decl.raws.before ? decl.raws.before.trim() : "";
    object[before + decl.prop] = decl.value;
  });
  return object;
};

const extractICSS = (css, removeRules = true) => {
  const icssImports = {};
  const icssExports = {};
  css.each(node => {
    if (node.type === "rule") {
      if (node.selector.slice(0, 7) === ":import") {
        const matches = importPattern.exec(node.selector);

        if (matches) {
          const path = matches[1].replace(/'|"/g, "");
          icssImports[path] = Object.assign(icssImports[path] || {}, getDeclsObject(node));

          if (removeRules) {
            node.remove();
          }
        }
      }

      if (node.selector === ":export") {
        Object.assign(icssExports, getDeclsObject(node));

        if (removeRules) {
          node.remove();
        }
      }
    }
  });
  return {
    icssImports,
    icssExports
  };
};

var _default = extractICSS;
exports.default = _default;