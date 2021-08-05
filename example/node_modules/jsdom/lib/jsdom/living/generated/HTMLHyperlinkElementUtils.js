"use strict";

const conversions = require("webidl-conversions");
const utils = require("./utils.js");

const impl = utils.implSymbol;

class HTMLHyperlinkElementUtils {
  constructor() {
    throw new TypeError("Illegal constructor");
  }

  get href() {
    if (!this || !module.exports.is(this)) {
      throw new TypeError("Illegal invocation");
    }

    return this[impl]["href"];
  }

  set href(V) {
    if (!this || !module.exports.is(this)) {
      throw new TypeError("Illegal invocation");
    }

    V = conversions["USVString"](V, {
      context: "Failed to set the 'href' property on 'HTMLHyperlinkElementUtils': The provided value"
    });

    this[impl]["href"] = V;
  }

  toString() {
    if (!this || !module.exports.is(this)) {
      throw new TypeError("Illegal invocation");
    }
    return this[impl]["href"];
  }

  get origin() {
    if (!this || !module.exports.is(this)) {
      throw new TypeError("Illegal invocation");
    }

    return this[impl]["origin"];
  }

  get protocol() {
    if (!this || !module.exports.is(this)) {
      throw new TypeError("Illegal invocation");
    }

    return this[impl]["protocol"];
  }

  set protocol(V) {
    if (!this || !module.exports.is(this)) {
      throw new TypeError("Illegal invocation");
    }

    V = conversions["USVString"](V, {
      context: "Failed to set the 'protocol' property on 'HTMLHyperlinkElementUtils': The provided value"
    });

    this[impl]["protocol"] = V;
  }

  get username() {
    if (!this || !module.exports.is(this)) {
      throw new TypeError("Illegal invocation");
    }

    return this[impl]["username"];
  }

  set username(V) {
    if (!this || !module.exports.is(this)) {
      throw new TypeError("Illegal invocation");
    }

    V = conversions["USVString"](V, {
      context: "Failed to set the 'username' property on 'HTMLHyperlinkElementUtils': The provided value"
    });

    this[impl]["username"] = V;
  }

  get password() {
    if (!this || !module.exports.is(this)) {
      throw new TypeError("Illegal invocation");
    }

    return this[impl]["password"];
  }

  set password(V) {
    if (!this || !module.exports.is(this)) {
      throw new TypeError("Illegal invocation");
    }

    V = conversions["USVString"](V, {
      context: "Failed to set the 'password' property on 'HTMLHyperlinkElementUtils': The provided value"
    });

    this[impl]["password"] = V;
  }

  get host() {
    if (!this || !module.exports.is(this)) {
      throw new TypeError("Illegal invocation");
    }

    return this[impl]["host"];
  }

  set host(V) {
    if (!this || !module.exports.is(this)) {
      throw new TypeError("Illegal invocation");
    }

    V = conversions["USVString"](V, {
      context: "Failed to set the 'host' property on 'HTMLHyperlinkElementUtils': The provided value"
    });

    this[impl]["host"] = V;
  }

  get hostname() {
    if (!this || !module.exports.is(this)) {
      throw new TypeError("Illegal invocation");
    }

    return this[impl]["hostname"];
  }

  set hostname(V) {
    if (!this || !module.exports.is(this)) {
      throw new TypeError("Illegal invocation");
    }

    V = conversions["USVString"](V, {
      context: "Failed to set the 'hostname' property on 'HTMLHyperlinkElementUtils': The provided value"
    });

    this[impl]["hostname"] = V;
  }

  get port() {
    if (!this || !module.exports.is(this)) {
      throw new TypeError("Illegal invocation");
    }

    return this[impl]["port"];
  }

  set port(V) {
    if (!this || !module.exports.is(this)) {
      throw new TypeError("Illegal invocation");
    }

    V = conversions["USVString"](V, {
      context: "Failed to set the 'port' property on 'HTMLHyperlinkElementUtils': The provided value"
    });

    this[impl]["port"] = V;
  }

  get pathname() {
    if (!this || !module.exports.is(this)) {
      throw new TypeError("Illegal invocation");
    }

    return this[impl]["pathname"];
  }

  set pathname(V) {
    if (!this || !module.exports.is(this)) {
      throw new TypeError("Illegal invocation");
    }

    V = conversions["USVString"](V, {
      context: "Failed to set the 'pathname' property on 'HTMLHyperlinkElementUtils': The provided value"
    });

    this[impl]["pathname"] = V;
  }

  get search() {
    if (!this || !module.exports.is(this)) {
      throw new TypeError("Illegal invocation");
    }

    return this[impl]["search"];
  }

  set search(V) {
    if (!this || !module.exports.is(this)) {
      throw new TypeError("Illegal invocation");
    }

    V = conversions["USVString"](V, {
      context: "Failed to set the 'search' property on 'HTMLHyperlinkElementUtils': The provided value"
    });

    this[impl]["search"] = V;
  }

  get hash() {
    if (!this || !module.exports.is(this)) {
      throw new TypeError("Illegal invocation");
    }

    return this[impl]["hash"];
  }

  set hash(V) {
    if (!this || !module.exports.is(this)) {
      throw new TypeError("Illegal invocation");
    }

    V = conversions["USVString"](V, {
      context: "Failed to set the 'hash' property on 'HTMLHyperlinkElementUtils': The provided value"
    });

    this[impl]["hash"] = V;
  }
}
Object.defineProperties(HTMLHyperlinkElementUtils.prototype, {
  href: { enumerable: true },
  toString: { enumerable: true },
  origin: { enumerable: true },
  protocol: { enumerable: true },
  username: { enumerable: true },
  password: { enumerable: true },
  host: { enumerable: true },
  hostname: { enumerable: true },
  port: { enumerable: true },
  pathname: { enumerable: true },
  search: { enumerable: true },
  hash: { enumerable: true },
  [Symbol.toStringTag]: { value: "HTMLHyperlinkElementUtils", configurable: true }
});
const iface = {
  // When an interface-module that implements this interface as a mixin is loaded, it will append its own `.is()`
  // method into this array. It allows objects that directly implements *those* interfaces to be recognized as
  // implementing this mixin interface.
  _mixedIntoPredicates: [],
  is(obj) {
    if (obj) {
      if (utils.hasOwn(obj, impl) && obj[impl] instanceof Impl.implementation) {
        return true;
      }
      for (const isMixedInto of module.exports._mixedIntoPredicates) {
        if (isMixedInto(obj)) {
          return true;
        }
      }
    }
    return false;
  },
  isImpl(obj) {
    if (obj) {
      if (obj instanceof Impl.implementation) {
        return true;
      }

      const wrapper = utils.wrapperForImpl(obj);
      for (const isMixedInto of module.exports._mixedIntoPredicates) {
        if (isMixedInto(wrapper)) {
          return true;
        }
      }
    }
    return false;
  },
  convert(obj, { context = "The provided value" } = {}) {
    if (module.exports.is(obj)) {
      return utils.implForWrapper(obj);
    }
    throw new TypeError(`${context} is not of type 'HTMLHyperlinkElementUtils'.`);
  },

  create(constructorArgs, privateData) {
    let obj = Object.create(HTMLHyperlinkElementUtils.prototype);
    obj = this.setup(obj, constructorArgs, privateData);
    return obj;
  },
  createImpl(constructorArgs, privateData) {
    let obj = Object.create(HTMLHyperlinkElementUtils.prototype);
    obj = this.setup(obj, constructorArgs, privateData);
    return utils.implForWrapper(obj);
  },
  _internalSetup(obj) {},
  setup(obj, constructorArgs, privateData) {
    if (!privateData) privateData = {};

    privateData.wrapper = obj;

    this._internalSetup(obj);
    Object.defineProperty(obj, impl, {
      value: new Impl.implementation(constructorArgs, privateData),
      configurable: true
    });

    obj[impl][utils.wrapperSymbol] = obj;
    if (Impl.init) {
      Impl.init(obj[impl], privateData);
    }
    return obj;
  },
  interface: HTMLHyperlinkElementUtils,
  expose: {}
}; // iface
module.exports = iface;

const Impl = require("../nodes/HTMLHyperlinkElementUtils-impl.js");
