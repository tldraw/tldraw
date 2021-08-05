for (let a in b) {}
for (let [a, b] in c) {}
for (let {a, b} in c) {}
for (let {a: b, c} in d) {}
for (let a of b) {}
for (var [a, b] of c) {}
for (let {a, b} in c) {}
for (let {a: b, c} in d) {}
for (let i = 0, {length} = list; i < length; i++) {}
for (; ; ) {}
for (function () {
  const i = 0;
}; ; ) {}
for (() => {
  const i = 0;
}; ; ) {}
async function test() {
  for await (const x of xs) {
    x();
  }
}
