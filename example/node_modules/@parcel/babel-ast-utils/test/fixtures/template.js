let a;
let b = `this is a template`;
let c = `this is a template\
with multiple
lines`;
let d = f`template with function`;
let e = f`template with ${some} ${variables}`;
let f = f`template with ${some}${variables}${attached}`;
let g = f()`template with function call before`;
let h = f().g`template with more complex function call`;
