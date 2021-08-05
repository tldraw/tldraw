"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = createDependencyLocation;

function createDependencyLocation(start, specifier, lineOffset = 0, columnOffset = 0, // Imports are usually wrapped in quotes
importWrapperLength = 2) {
  return {
    filePath: specifier,
    start: {
      line: start.line + lineOffset,
      column: start.column + columnOffset
    },
    end: {
      line: start.line + lineOffset,
      column: start.column + specifier.length - 1 + importWrapperLength + columnOffset
    }
  };
}