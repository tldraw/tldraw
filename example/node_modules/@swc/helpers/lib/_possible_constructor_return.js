"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = _possibleConstructorReturn;
var _assertThisInitialized = _interopRequireDefault(require("./_assert_this_initialized"));
var _typeOf = _interopRequireDefault(require("./_type_of"));
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function _possibleConstructorReturn(self, call) {
    if (call && ((0, _typeOf).default(call) === "object" || typeof call === "function")) {
        return call;
    }
    return (0, _assertThisInitialized).default(self);
}
