class A {
  constructor() {}
}
class B extends A {}
class C extends A {
  method() {}
  get property() {
    return this._property;
  }
  // /* foo */
  set property(value) {
    this._property = value;
  }
}
class D extends class A {} {}
class E extends class {
  constructor() {}
} {}
class F extends class {
  constructor() {}
} {
  constructor() {}
}
class G {
  [Symbol.iterator]() {}
  ["method"]() {}
}
class H {
  static classMethod() {}
  method() {}
}
class I {
  static get property() {}
  static set property(value) {}
}
class J extends A {
  constructor() {
    super();
  }
}
