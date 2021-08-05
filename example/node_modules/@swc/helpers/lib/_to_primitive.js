"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = _toPrimitive;
var _typeOf = _interopRequireDefault(require("./_type_of"));
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function _toPrimitive(input, hint) {
    if ((0, _typeOf).default(input) !== "object" || input === null) return input;
    var prim = input[Symbol.toPrimitive];
    if (prim !== undefined) {
        var res = prim.call(input, hint || "default");
        if ((0, _typeOf).default(res) !== "object") return res;
        throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return (hint === "string" ? String : Number)(input);
}
