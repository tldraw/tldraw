"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = validateModuleSpecifier;
const MODULE_REGEX = /^((@[^/\s]+\/){0,1}([^/\s.~]+[^/\s]*)){1}(@[^/\s]+){0,1}/;

function validateModuleSpecifier(moduleName) {
  let matches = MODULE_REGEX.exec(moduleName);

  if (matches) {
    return matches[0];
  }

  return '';
}