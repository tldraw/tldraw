try {
  let a = 42;
} catch (error) {
  let b = error;
}
try {
  let a = 42;
} catch (error) {
  let b = error;
} finally {
  let c = "done";
}
throw new Error("this is an error");
