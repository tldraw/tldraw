"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = _wrapNativeSuper;
var _construct = _interopRequireDefault(require("./_construct"));
var _isNativeFunction = _interopRequireDefault(require("./_is_native_function"));
var _getPrototypeOf = _interopRequireDefault(require("./_get_prototype_of"));
var _setPrototypeOf = _interopRequireDefault(require("./_set_prototype_of"));
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function wrapNativeSuper(Class) {
    var _cache = typeof Map === "function" ? new Map() : undefined;
    wrapNativeSuper = function wrapNativeSuper1(Class1) {
        var Wrapper = function Wrapper() {
            return (0, _construct).default(Class1, arguments, (0, _getPrototypeOf).default(this).constructor);
        };
        if (Class1 === null || !(0, _isNativeFunction).default(Class1)) return Class1;
        if (typeof Class1 !== "function") {
            throw new TypeError("Super expression must either be null or a function");
        }
        if (typeof _cache !== "undefined") {
            if (_cache.has(Class1)) return _cache.get(Class1);
            _cache.set(Class1, Wrapper);
        }
        Wrapper.prototype = Object.create(Class1.prototype, {
            constructor: {
                value: Wrapper,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        return (0, _setPrototypeOf).default(Wrapper, Class1);
    };
    return wrapNativeSuper(Class);
}
function _wrapNativeSuper(Class) {
    return wrapNativeSuper(Class);
}
