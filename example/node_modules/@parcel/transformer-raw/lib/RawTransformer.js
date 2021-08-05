"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function _plugin() {
  const data = require("@parcel/plugin");

  _plugin = function () {
    return data;
  };

  return data;
}

var _default = new (_plugin().Transformer)({
  transform({
    asset
  }) {
    asset.bundleBehavior = 'isolated';
    return [asset];
  }

});

exports.default = _default;