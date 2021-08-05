"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = _inherits;
var _setPrototypeOf = _interopRequireDefault(require("./_set_prototype_of"));
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
        throw new TypeError("Super expression must either be null or a function");
    }
    subClass.prototype = Object.create(superClass && superClass.prototype, {
        constructor: {
            value: subClass,
            writable: true,
            configurable: true
        }
    });
    if (superClass) (0, _setPrototypeOf).default(subClass, superClass);
}
