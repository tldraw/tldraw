"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createBuildCache = createBuildCache;
exports.clearBuildCaches = clearBuildCaches;
const buildCaches = [];

function createBuildCache() {
  let cache = new Map();
  buildCaches.push(cache);
  return cache;
}

function clearBuildCaches() {
  for (let cache of buildCaches) {
    cache.clear();
  }
}