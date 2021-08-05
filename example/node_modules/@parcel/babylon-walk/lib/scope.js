"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.scopeVisitor = exports.Scope = void 0;

function t() {
  const data = _interopRequireWildcard(require("@babel/types"));

  t = function () {
    return data;
  };

  return data;
}

function _assert() {
  const data = _interopRequireDefault(require("assert"));

  _assert = function () {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

class Scope {
  names = new Set();
  bindings = new Map();
  references = new Map();
  renames = new Map();
  inverseRenames = new Map();

  constructor(type, parent) {
    this.type = type;
    this.parent = parent;
    this.program = parent ? parent.program : this;
  }

  has(name) {
    if (this.names.has(name)) {
      return true;
    }

    if (this.parent) {
      return this.parent.has(name);
    }

    return false;
  }

  add(name) {
    this.names.add(name);
  }

  generateUid(name = 'temp') {
    name = t().toIdentifier(name).replace(/^_+/, '').replace(/[0-9]+$/g, '');
    let uid;
    let i = 0;

    do {
      uid = '_' + name + (i > 1 ? i : '');
      i++;
    } while (this.program.names.has(uid));

    this.program.names.add(uid);
    return uid;
  }

  addBinding(name, decl, type) {
    if (type === 'var' && this.type !== 'function' && this.type !== 'arrow_function' && this.parent) {
      this.parent.addBinding(name, decl, type);
    } else {
      if (type === 'param') type = 'var';
      this.names.add(name);
      this.bindings.set(name, decl);
      this.program.names.add(name);
    }
  }

  getBinding(name) {
    var _this$bindings$get, _this$parent;

    return (_this$bindings$get = this.bindings.get(name)) !== null && _this$bindings$get !== void 0 ? _this$bindings$get : (_this$parent = this.parent) === null || _this$parent === void 0 ? void 0 : _this$parent.getBinding(name);
  }

  addReference(identifier) {
    let references = this.references.get(identifier.name);

    if (!references) {
      references = new Set();
      this.references.set(identifier.name, references);
    }

    references.add(identifier);
  }

  rename(from, to) {
    // If already renamed, update the original to the final name.
    let renamed = this.inverseRenames.get(from);

    if (renamed) {
      this.renames.set(renamed, to);
    } else {
      this.renames.set(from, to);
      this.inverseRenames.set(to, from);
    }
  }

  exit() {
    // Rename declarations in this scope.
    for (let [from, to] of this.renames) {
      if (!this.names.has(from) && this.parent) {
        this.parent.rename(from, to);
      }

      let references = this.references.get(from);

      if (!references) {
        continue;
      }

      for (let id of references) {
        id.name = to;
      }
    } // Propagate unknown references to the parent scope.


    let parent = this.parent;

    if (parent) {
      for (let [name, ids] of this.references) {
        if (!this.names.has(name)) {
          for (let id of ids) {
            parent.addReference(id);
          }
        }
      }
    }
  }

}

exports.Scope = Scope;
let scopeVisitor = {
  Program(node, state) {
    if (!state.scope) {
      state.scope = new Scope('program');
    }
  },

  Scopable: {
    enter(node, state, ancestors) {
      if (!t().isScope(node, ancestors[ancestors.length - 2]) || t().isProgram(node) || t().isFunction(node)) {
        return;
      }

      state.scope = new Scope('block', state.scope);
    },

    exit(node, state, ancestors) {
      if (!t().isScope(node, ancestors[ancestors.length - 2])) {
        return;
      }

      state.scope.exit();

      if (state.scope.parent) {
        state.scope = state.scope.parent;
      }
    }

  },
  Declaration: {
    exit(node, {
      scope
    }) {
      if (t().isFunction(node) || t().isExportDeclaration(node)) {
        return;
      } // Register declarations with the scope.


      if ((0, t().isVariableDeclaration)(node)) {
        for (let decl of node.declarations) {
          let ids = t().getBindingIdentifiers(decl);

          for (let id in ids) {
            scope.addBinding(id, decl, node.kind);
          }
        }
      } else {
        let type;

        if ((0, t().isClassDeclaration)(node)) {
          type = 'let';
        } else if ((0, t().isImportDeclaration)(node)) {
          type = 'const';
        } else {
          (0, _assert().default)(false);
        }

        let ids = t().getBindingIdentifiers(node);

        for (let id in ids) {
          scope.addBinding(id, node, type);
        }
      }
    }

  },

  Function(node, state) {
    // Add function name to outer scope
    let name;

    if ((0, t().isFunctionDeclaration)(node) && (0, t().isIdentifier)(node.id)) {
      name = node.id.name;
      state.scope.addBinding(name, node, 'var');
    } // Create new scope


    let type = t().isArrowFunctionExpression(node) ? 'arrow_function' : 'function';
    state.scope = new Scope(type, state.scope); // Add inner bindings to inner scope

    let inner = t().getBindingIdentifiers(node);

    for (let id in inner) {
      if (id !== name) {
        state.scope.addBinding(id, inner[id], 'param');
      }
    }
  },

  Identifier(node, state, ancestors) {
    let parent = ancestors[ancestors.length - 2];

    if (!t().isReferenced(node, parent, ancestors[ancestors.length - 3])) {
      return;
    }

    state.scope.addReference(node);
  }

};
exports.scopeVisitor = scopeVisitor;