function f(a, b, c) {
  return null;
}
var g = function (a, b, c) {
  return null;
};
function h(a, b = 1, c = 2) {
  return null;
}
function i(a = 1, b, c) {
  return null;
}
function j(...a) {}
function k() {}
var l = function () {};
var m = function (a = 1, b, c) {};
function* o() {
  yield 42;
}
function* p() {
  yield 42;
  yield 7;
  return "answer";
}
let q = function* () {};
let r = a => a;
let s = (a, b) => a + b;
let t = (a, b = 0) => a + b;
let u = (a, b) => {};
let v = () => {};
let w = () => ({});
let x = () => {
  let a = 42;
  return a;
};
let y = () => ({
  a: 1,
  b: 2
});
let z = a => a?.b;
let za = a => a?.();
let zb = a => 1;
function zc() {
  function a() {
    return (
      // comment
      null
    );
    console.log(2);
  }
  // abc
  console.log(1);
}
