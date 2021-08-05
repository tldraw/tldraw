"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = saveJSON;

var _fs = require("fs");

function saveJSON(cssFile, json) {
  return new Promise((resolve, reject) => {
    (0, _fs.writeFile)(`${cssFile}.json`, JSON.stringify(json), e => e ? reject(e) : resolve(json));
  });
}