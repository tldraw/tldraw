"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = _readOnlyError;
function _readOnlyError(name) {
    throw new Error("\"" + name + "\" is read-only");
}
