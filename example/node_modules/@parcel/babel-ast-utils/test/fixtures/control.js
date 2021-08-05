throw (
  /*comment*/
  new Error("abc")
);
if (a > b) {} else {}
if (c != d) {}
var a = b > c ? d : e;
let b = (c = 1) ? d : e;
switch (a) {
  case b:
    break;
  case "c":
    break;
  case 42:
    break;
  case d:
    if (a < b) {}
    break;
  default:
    break;
}
while (a > b) {
  if (c == d) {
    break;
  }
}
do {
  if (e === f) {
    continue;
  }
} while (g < h);
label: if (a === b) {
  if (b = c) {
    break label;
  }
}
if (a != b) {}
endingLabel: {}
