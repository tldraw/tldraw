"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.hashStream = hashStream;
exports.hashObject = hashObject;
exports.hashFile = hashFile;

var _collection = require("./collection");

function _hash() {
  const data = require("@parcel/hash");

  _hash = function () {
    return data;
  };

  return data;
}

function hashStream(stream) {
  let hash = new (_hash().Hash)();
  return new Promise((resolve, reject) => {
    stream.on('error', err => {
      reject(err);
    });
    stream.on('data', chunk => {
      hash.writeBuffer(chunk);
    }).on('end', function () {
      resolve(hash.finish());
    }).on('error', err => {
      reject(err);
    });
  });
}

function hashObject(obj) {
  return (0, _hash().hashString)(JSON.stringify((0, _collection.objectSortedEntriesDeep)(obj)));
}

function hashFile(fs, filePath) {
  return hashStream(fs.createReadStream(filePath));
}