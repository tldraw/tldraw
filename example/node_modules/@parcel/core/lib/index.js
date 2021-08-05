"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "registerSerializableClass", {
  enumerable: true,
  get: function () {
    return _serializer.registerSerializableClass;
  }
});
Object.defineProperty(exports, "unregisterSerializableClass", {
  enumerable: true,
  get: function () {
    return _serializer.unregisterSerializableClass;
  }
});
Object.defineProperty(exports, "prepareForSerialization", {
  enumerable: true,
  get: function () {
    return _serializer.prepareForSerialization;
  }
});
Object.defineProperty(exports, "restoreDeserializedObject", {
  enumerable: true,
  get: function () {
    return _serializer.restoreDeserializedObject;
  }
});
Object.defineProperty(exports, "serialize", {
  enumerable: true,
  get: function () {
    return _serializer.serialize;
  }
});
Object.defineProperty(exports, "deserialize", {
  enumerable: true,
  get: function () {
    return _serializer.deserialize;
  }
});
Object.defineProperty(exports, "default", {
  enumerable: true,
  get: function () {
    return _Parcel.default;
  }
});
Object.defineProperty(exports, "BuildError", {
  enumerable: true,
  get: function () {
    return _Parcel.BuildError;
  }
});
Object.defineProperty(exports, "createWorkerFarm", {
  enumerable: true,
  get: function () {
    return _Parcel.createWorkerFarm;
  }
});
Object.defineProperty(exports, "INTERNAL_RESOLVE", {
  enumerable: true,
  get: function () {
    return _Parcel.INTERNAL_RESOLVE;
  }
});
Object.defineProperty(exports, "INTERNAL_TRANSFORM", {
  enumerable: true,
  get: function () {
    return _Parcel.INTERNAL_TRANSFORM;
  }
});

var _serializer = require("./serializer");

var _Parcel = _interopRequireWildcard(require("./Parcel"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }