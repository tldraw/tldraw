"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = _construct;
function isNativeReflectConstruct() {
    if (typeof Reflect === "undefined" || !Reflect.construct) return false;
    if (Reflect.construct.sham) return false;
    if (typeof Proxy === "function") return true;
    try {
        Date.prototype.toString.call(Reflect.construct(Date, [], function() {
        }));
        return true;
    } catch (e) {
        return false;
    }
}
function construct(Parent, args, Class) {
    if (isNativeReflectConstruct()) {
        construct = Reflect.construct;
    } else {
        construct = function construct1(Parent1, args1, Class1) {
            var a = [
                null
            ];
            a.push.apply(a, args1);
            var Constructor = Function.bind.apply(Parent1, a);
            var instance = new Constructor();
            if (Class1) _setPrototypeOf(instance, Class1.prototype);
            return instance;
        };
    }
    return construct.apply(null, arguments);
}
function _construct(Parent, args, Class) {
    return construct.apply(null, arguments);
}
