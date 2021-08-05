"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.unique = unique;
exports.objectSortedEntries = objectSortedEntries;
exports.objectSortedEntriesDeep = objectSortedEntriesDeep;
exports.setDifference = setDifference;

function unique(array) {
  return [...new Set(array)];
}

function objectSortedEntries(obj) {
  return Object.entries(obj).sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
}

function objectSortedEntriesDeep(object) {
  let sortedEntries = objectSortedEntries(object);

  for (let i = 0; i < sortedEntries.length; i++) {
    sortedEntries[i][1] = sortEntry(sortedEntries[i][1]);
  }

  return sortedEntries;
}

function sortEntry(entry) {
  if (Array.isArray(entry)) {
    return entry.map(sortEntry);
  }

  if (typeof entry === 'object' && entry != null) {
    return objectSortedEntriesDeep(entry);
  }

  return entry;
}

function setDifference(a, b) {
  let difference = new Set();

  for (let e of a) {
    if (!b.has(e)) {
      difference.add(e);
    }
  }

  return difference;
}