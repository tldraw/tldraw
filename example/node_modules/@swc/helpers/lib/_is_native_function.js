"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = _isNativeFunction;
function _isNativeFunction(fn) {
    return Function.toString.call(fn).indexOf("[native code]") !== -1;
}
