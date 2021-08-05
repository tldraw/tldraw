"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.babelErrorEnhancer = babelErrorEnhancer;

async function babelErrorEnhancer(error, asset) {
  if (error.loc) {
    let start = error.message.startsWith(asset.filePath) ? asset.filePath.length + 1 : 0;
    error.message = error.message.slice(start).split('\n')[0].trim();
  }

  error.source = await asset.getCode();
  error.filePath = asset.filePath;
  return error;
}