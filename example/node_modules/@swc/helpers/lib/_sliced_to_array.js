"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = _slicedToArray;
var _arrayWithHoles = _interopRequireDefault(require("./_array_with_holes"));
var _iterableToArray = _interopRequireDefault(require("./_iterable_to_array"));
var _nonIterableRest = _interopRequireDefault(require("./_non_iterable_rest"));
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function _slicedToArray(arr, i) {
    return (0, _arrayWithHoles).default(arr) || (0, _iterableToArray).default(arr, i) || (0, _nonIterableRest).default();
}
