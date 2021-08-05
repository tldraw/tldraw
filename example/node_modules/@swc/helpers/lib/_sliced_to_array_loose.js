"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = _slicedToArrayLoose;
var _arrayWithHoles = _interopRequireDefault(require("./_array_with_holes"));
var _iterableToArrayLimitLoose = _interopRequireDefault(require("./_iterable_to_array_limit_loose"));
var _nonIterableRest = _interopRequireDefault(require("./_non_iterable_rest"));
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function _slicedToArrayLoose(arr, i) {
    return (0, _arrayWithHoles).default(arr) || (0, _iterableToArrayLimitLoose).default(arr, i) || (0, _nonIterableRest).default();
}
