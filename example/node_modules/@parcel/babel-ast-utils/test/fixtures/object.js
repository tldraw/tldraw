let a = {};
let b = {
  "1": "one",
  "2": "two",
  "3": "three"
};
let c = {
  [42]: "answer",
  [7]: "lucky"
};
let d = {
  a: 1,
  b: 2,
  c: 3
};
let e = d.a;
let f = d["c"];
let g = {
  m() {},
  ['n'](a) {},
  o(a) {
    return a;
  }
};
let h = ({}).toString();
let i = {
  ...d,
  a
};
a?.['b']?.[0]?.(1);
