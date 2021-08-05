"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = throttle;

function throttle(fn, delay) {
  let lastCalled;
  return function (...args) {
    if (lastCalled == null || lastCalled + delay <= Date.now()) {
      fn.call(this, ...args);
      lastCalled = Date.now();
    }
  };
}