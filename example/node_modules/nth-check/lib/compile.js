"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compile = void 0;
var boolbase_1 = require("boolbase");
/**
 * Returns a function that checks if an elements index matches the given rule
 * highly optimized to return the fastest solution.
 *
 * @param parsed A tuple [a, b], as returned by `parse`.
 * @returns A highly optimized function that returns whether an index matches the nth-check.
 * @example
 * const check = nthCheck.compile([2, 3]);
 *
 * check(0); // `false`
 * check(1); // `false`
 * check(2); // `true`
 * check(3); // `false`
 * check(4); // `true`
 * check(5); // `false`
 * check(6); // `true`
 */
function compile(parsed) {
    var a = parsed[0];
    // Subtract 1 from `b`, to convert from one- to zero-indexed.
    var b = parsed[1] - 1;
    /*
     * When `b <= 0`, `a * n` won't be lead to any matches for `a < 0`.
     * Besides, the specification states that no elements are
     * matched when `a` and `b` are 0.
     *
     * `b < 0` here as we subtracted 1 from `b` above.
     */
    if (b < 0 && a <= 0)
        return boolbase_1.falseFunc;
    // When `a` is in the range -1..1, it matches any element (so only `b` is checked).
    if (a === -1)
        return function (index) { return index <= b; };
    if (a === 0)
        return function (index) { return index === b; };
    // When `b <= 0` and `a === 1`, they match any element.
    if (a === 1)
        return b < 0 ? boolbase_1.trueFunc : function (index) { return index >= b; };
    /*
     * Otherwise, modulo can be used to check if there is a match.
     *
     * Modulo doesn't care about the sign, so let's use `a`s absolute value.
     */
    var absA = Math.abs(a);
    // Get `b mod a`, + a if this is negative.
    var bMod = ((b % absA) + absA) % absA;
    return a > 1
        ? function (index) { return index >= b && index % absA === bMod; }
        : function (index) { return index <= b && index % absA === bMod; };
}
exports.compile = compile;
