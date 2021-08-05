"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = _wrapAsyncGenerator;
var _asyncGenerator = _interopRequireDefault(require("./_async_generator"));
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function _wrapAsyncGenerator(fn) {
    return function() {
        return new _asyncGenerator.default(fn.apply(this, arguments));
    };
}
