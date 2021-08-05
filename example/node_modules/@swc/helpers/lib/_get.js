"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = _get;
var _superPropBase = _interopRequireDefault(require("./_super_prop_base"));
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function get(target, property, receiver) {
    if (typeof Reflect !== "undefined" && Reflect.get) {
        get = Reflect.get;
    } else {
        get = function get1(target1, property1, receiver1) {
            var base = (0, _superPropBase).default(target1, property1);
            if (!base) return;
            var desc = Object.getOwnPropertyDescriptor(base, property1);
            if (desc.get) {
                return desc.get.call(receiver1 || target1);
            }
            return desc.value;
        };
    }
    return get(target, property, receiver);
}
function _get(target, property, reciever) {
    return get(target, property, reciever);
}
