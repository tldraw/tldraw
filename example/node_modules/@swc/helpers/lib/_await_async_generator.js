"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = _awaitAsyncGenerator;
var _awaitValue = _interopRequireDefault(require("./_await_value"));
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function _awaitAsyncGenerator(value) {
    return new _awaitValue.default(value);
}
