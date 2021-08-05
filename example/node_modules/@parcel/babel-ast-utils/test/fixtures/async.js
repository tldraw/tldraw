async function f() {}
const g = async function () {};
const a = {
  async f() {}
};
const h = async () => {};
async function j() {
  (await g()).a;
  await g().a;
  return await f();
}
async function k() {
  return await (obj = Promise.resolve(1));
}
async function l() {
  await (() => 1);
}
