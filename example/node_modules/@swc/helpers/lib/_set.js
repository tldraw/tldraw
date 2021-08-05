"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = _set;
var _defineProperty = _interopRequireDefault(require("./_define_property"));
var _superPropBase = _interopRequireDefault(require("./_super_prop_base"));
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function set(target, property, value, receiver) {
    if (typeof Reflect !== "undefined" && Reflect.set) {
        set = Reflect.set;
    } else {
        set = function set1(target1, property1, value1, receiver1) {
            var base = (0, _superPropBase).default(target1, property1);
            var desc;
            if (base) {
                desc = Object.getOwnPropertyDescriptor(base, property1);
                if (desc.set) {
                    desc.set.call(receiver1, value1);
                    return true;
                } else if (!desc.writable) {
                    return false;
                }
            }
            desc = Object.getOwnPropertyDescriptor(receiver1, property1);
            if (desc) {
                if (!desc.writable) {
                    return false;
                }
                desc.value = value1;
                Object.defineProperty(receiver1, property1, desc);
            } else {
                (0, _defineProperty).default(receiver1, property1, value1);
            }
            return true;
        };
    }
    return set(target, property, value, receiver);
}
function _set(target, property, value, receiver, isStrict) {
    var s = set(target, property, value, receiver || target);
    if (!s && isStrict) {
        throw new Error('failed to set property');
    }
    return value;
}
