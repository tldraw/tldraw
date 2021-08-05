// @flow

import type {Identifier, Node} from '@babel/types';
import type {Visitors} from './types';
import * as t from '@babel/types';
import invariant from 'assert';
import {
  isClassDeclaration,
  isFunctionDeclaration,
  isIdentifier,
  isImportDeclaration,
  isVariableDeclaration,
} from '@babel/types';

export type ScopeType = 'program' | 'function' | 'arrow_function' | 'block';
export type BindingType = 'var' | 'let' | 'const';
export class Scope {
  type: ScopeType;
  names: Set<string> = new Set();
  bindings: Map<string, Node> = new Map();
  references: Map<string, Set<Identifier>> = new Map();
  parent: ?Scope;
  program: Scope;
  renames: Map<string, string> = new Map();
  inverseRenames: Map<string, string> = new Map();

  constructor(type: ScopeType, parent: ?Scope) {
    this.type = type;
    this.parent = parent;
    this.program = parent ? parent.program : this;
  }

  has(name: string): boolean {
    if (this.names.has(name)) {
      return true;
    }

    if (this.parent) {
      return this.parent.has(name);
    }

    return false;
  }

  add(name: string) {
    this.names.add(name);
  }

  generateUid(name: string = 'temp'): string {
    name = t
      .toIdentifier(name)
      .replace(/^_+/, '')
      .replace(/[0-9]+$/g, '');

    let uid;
    let i = 0;
    do {
      uid = '_' + name + (i > 1 ? i : '');
      i++;
    } while (this.program.names.has(uid));

    this.program.names.add(uid);
    return uid;
  }

  addBinding(name: string, decl: Node, type: BindingType | 'param') {
    if (
      type === 'var' &&
      this.type !== 'function' &&
      this.type !== 'arrow_function' &&
      this.parent
    ) {
      this.parent.addBinding(name, decl, type);
    } else {
      if (type === 'param') type = 'var';
      this.names.add(name);
      this.bindings.set(name, decl);
      this.program.names.add(name);
    }
  }

  getBinding(name: string): ?Node {
    return this.bindings.get(name) ?? this.parent?.getBinding(name);
  }

  addReference(identifier: Identifier) {
    let references = this.references.get(identifier.name);
    if (!references) {
      references = new Set();
      this.references.set(identifier.name, references);
    }

    references.add(identifier);
  }

  rename(from: string, to: string) {
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
    }

    // Propagate unknown references to the parent scope.
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

export type ScopeState = {|
  scope: Scope,
|};

export let scopeVisitor: Visitors<ScopeState> = {
  Program(node, state) {
    if (!state.scope) {
      state.scope = new Scope('program');
    }
  },
  Scopable: {
    enter(node, state, ancestors) {
      if (
        !t.isScope(node, ancestors[ancestors.length - 2]) ||
        t.isProgram(node) ||
        t.isFunction(node)
      ) {
        return;
      }

      state.scope = new Scope('block', state.scope);
    },
    exit(node, state, ancestors) {
      if (!t.isScope(node, ancestors[ancestors.length - 2])) {
        return;
      }

      state.scope.exit();
      if (state.scope.parent) {
        state.scope = state.scope.parent;
      }
    },
  },
  Declaration: {
    exit(node, {scope}) {
      if (t.isFunction(node) || t.isExportDeclaration(node)) {
        return;
      }

      // Register declarations with the scope.
      if (isVariableDeclaration(node)) {
        for (let decl of node.declarations) {
          let ids = t.getBindingIdentifiers(decl);
          for (let id in ids) {
            scope.addBinding(id, decl, node.kind);
          }
        }
      } else {
        let type: BindingType;
        if (isClassDeclaration(node)) {
          type = 'let';
        } else if (isImportDeclaration(node)) {
          type = 'const';
        } else {
          invariant(false);
        }
        let ids = t.getBindingIdentifiers(node);
        for (let id in ids) {
          scope.addBinding(id, node, type);
        }
      }
    },
  },
  Function(node, state) {
    // Add function name to outer scope
    let name;
    if (isFunctionDeclaration(node) && isIdentifier(node.id)) {
      name = node.id.name;
      state.scope.addBinding(name, node, 'var');
    }

    // Create new scope
    let type = t.isArrowFunctionExpression(node)
      ? 'arrow_function'
      : 'function';
    state.scope = new Scope(type, state.scope);

    // Add inner bindings to inner scope
    let inner = t.getBindingIdentifiers(node);
    for (let id in inner) {
      if (id !== name) {
        state.scope.addBinding(id, inner[id], 'param');
      }
    }
  },
  Identifier(node, state, ancestors) {
    let parent = ancestors[ancestors.length - 2];
    if (!t.isReferenced(node, parent, ancestors[ancestors.length - 3])) {
      return;
    }

    state.scope.addReference(node);
  },
};
