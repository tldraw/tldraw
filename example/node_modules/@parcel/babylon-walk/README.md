# babylon-walk

Lightweight AST traversal tools for [Babylon] ASTs.

Babylon is the parser used by the [Babel] project, which supplies the wonderful [babel-traverse] module for walking Babylon ASTs. Problem is, babel-traverse is very heavyweight, as it is designed to supply utilities to make all sorts of AST transformations possible. For simple AST walking without transformation, babel-traverse brings a lot of overhead.

This module loosely implements the API of Acorn parser's [walk module], which is a lightweight AST walker for the ESTree AST format.

In my tests, babylon-walk's ancestor walker (the most complex walker provided by this module) is about 8 times faster than babel-traverse, if the visitors are cached and the same AST is used for all runs. It is about 16 times faster if a fresh AST is used every run.

[![Dependency Status](https://img.shields.io/david/pugjs/babylon-walk.svg)](https://david-dm.org/pugjs/babylon-walk)
[![NPM version](https://img.shields.io/npm/v/babylon-walk.svg)](https://www.npmjs.com/package/babylon-walk)

[babylon]: https://github.com/babel/babylon
[babel]: https://babeljs.io/
[babel-traverse]: https://github.com/thejameskyle/babel-handbook/blob/master/translations/en/plugin-handbook.md#toc-babel-traverse
[walk module]: https://github.com/ternjs/acorn#distwalkjs

## Installation

```sh
$ npm install babylon-walk
```

## API

```js
var walk = require('babylon-walk');
```

### walk.simple(node, visitors, state)

Do a simple walk over the AST. `node` should be the AST node to walk, and `visitors` an object containing Babel [visitors]. Each visitor function will be called as `(node, state)`, where `node` is the AST node, and `state` is the same `state` passed to `walk.simple`.

When `walk.simple` is called with a fresh set of visitors, it will first "explode" the visitors (e.g. expanding `Visitor(node, state) {}` to `Visitor() { enter(node, state) {} }`). This exploding process can take some time, so it is recommended to [cache your visitors] and communicate state leveraging the `state` parameter. (One difference between the linked article and babylon-walk is that the state is only accessible through the `state` variable, never as `this`.)

All [babel-types] aliases (e.g. `Expression`) and the union syntax (e.g. `'Identifier|AssignmentPattern'(node, state) {}`) work.

### walk.ancestor(node, visitors, state)

Do a simple walk over the AST, but memoizing the ancestors of the node and making them available to the visitors. `node` should be the AST node to walk, and `visitors` an object containing Babel [visitors]. Each visitor function will be called as `(node, state, ancestors)`, where `node` is the AST node, `state` is the same `state` passed to `walk.ancestor`, and `ancestors` is an array of ancestors to the node (with the outermost node being `[0]` and the current node being `[ancestors.length - 1]`). If `state` is not specified in the call to `walk.ancestor`, the `state` parameter will be set to `ancestors`.

When `walk.ancestor` is called with a fresh set of visitors, it will first "explode" the visitors (e.g. expanding `Visitor(node, state) {}` to `Visitor() { enter(node, state) {} }`). This exploding process can take some time, so it is recommended to [cache your visitors] and communicate state leveraging the `state` parameter. (One difference between the linked article and babylon-walk is that the state is only accessible through the `state` variable, never as `this`.)

All [babel-types] aliases (e.g. `Expression`) and the union syntax (e.g. `'Identifier|AssignmentPattern'(node, state) {}`) work.

### walk.recursive(node, visitors, state)

Do a recursive walk over the AST, where the visitors are responsible for continuing the walk on the child nodes of their target node. `node` should be the AST node to walk, and `visitors` an object containing Babel [visitors]. Each visitor function will be called as `(node, state, c)`, where `node` is the AST node, `state` is the same `state` passed to `walk.recursive`, and `c` is a function that takes a single node as argument and continues walking _that_ node. If no visitor for a node is provided, the default walker algorithm will still be used.

When `walk.recursive` is called with a fresh set of visitors, it will first "explode" the visitors (e.g. expanding `Visitor(node, state) {}` to `Visitor() { enter(node, state) {} }`). This exploding process can take some time, so it is recommended to [cache your visitors] and communicate state leveraging the `state` parameter. (One difference between the linked article and babylon-walk is that the state is only accessible through the `state` variable, never as `this`.)

Unlike other babylon-walk walkers, `walk.recursive` does not call the `exit` visitor, only the `enter` (the default) visitor, of a specific node type.

All [babel-types] aliases (e.g. `Expression`) and the union syntax (e.g. `'Identifier|AssignmentPattern'(node, state) {}`) work.

In the following example, we are trying to count the number of functions in the outermost scope. This means, that we can simply walk all the statements and increment a counter if it is a function declaration or expression, and then stop walking. Note that we do not specify a visitor for the `Program` node, and the default algorithm for walking `Program` nodes is used (which is what we want). Also of note is how I bring the `visitors` object outside of `countFunctions` so that the object can be cached to improve performance.

```js
import * as t from 'babel-types';
import {parse} from 'babylon';
import * as walk from 'babylon-walk';

const visitors = {
  Statement(node, state, c) {
    if (t.isVariableDeclaration(node)) {
      for (let declarator of node.declarations) {
        // Continue walking the declarator
        c(declarator);
      }
    } else if (t.isFunctionDeclaration(node)) {
      state.counter++;
    }
  },

  VariableDeclarator(node, state) {
    if (t.isFunction(node.init)) {
      state.counter++;
    }
  },
};

function countFunctions(node) {
  const state = {
    counter: 0,
  };
  walk.recursive(node, visitors, state);
  return state.counter;
}

const ast = parse(`
  // Counts
  var a = () => {};

  // Counts
  function b() {
    // Doesn't count
    function c() {
    }
  }

  // Counts
  const c = function d() {};
`);

countFunctions(ast);
// = 3
```

### walk.traverse(node, visitors, state)

Visitors get called as `(path, state)`. Every `Path` has these methods (similar to `@babel/traverse`):

- `skip()`
- `replaceWith(node)`
- `remove()`

[babel-types]: https://github.com/babel/babel/tree/master/packages/babel-types
[cache your visitors]: https://github.com/thejameskyle/babel-handbook/blob/master/translations/en/plugin-handbook.md#toc-optimizing-nested-visitors
[visitors]: https://github.com/thejameskyle/babel-handbook/blob/master/translations/en/plugin-handbook.md#toc-visitors

## Caveat

For those of you migrating from Acorn to Babylon, there are a few things to be aware of.

1. The visitor caching suggestions do not apply to Acorn's walk module, but do for babylon-walk.

2. babylon-walk does not provide any of the other functions Acorn's walk module provides (e.g. `make`, `findNode*`).

3. babylon-walk does not use a `base` variable. The walker algorithm is the same as what babel-traverse uses.
   - That means certain nodes that are not walked by Acorn, such as the `property` property of a non-computed `MemberExpression`, are walked by babylon-walk.

## License

MIT
