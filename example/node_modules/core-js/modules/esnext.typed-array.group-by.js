'use strict';
var ArrayBufferViewCore = require('../internals/array-buffer-view-core');
var $groupBy = require('../internals/array-group-by');
var typedArraySpeciesConstructor = require('../internals/typed-array-species-constructor');

var aTypedArray = ArrayBufferViewCore.aTypedArray;
var exportTypedArrayMethod = ArrayBufferViewCore.exportTypedArrayMethod;

// `%TypedArray%.prototype.groupBy` method
// https://github.com/tc39/proposal-array-grouping
exportTypedArrayMethod('groupBy', function groupBy(callbackfn /* , thisArg */) {
  var thisArg = arguments.length > 1 ? arguments[1] : undefined;
  return $groupBy(aTypedArray(this), callbackfn, thisArg, typedArraySpeciesConstructor);
});
