# Astring

[![NPM Version](https://img.shields.io/npm/v/astring.svg)](https://www.npmjs.org/package/astring)
[![Build Status](https://travis-ci.org/davidbonnet/astring.svg?branch=master)](https://travis-ci.org/davidbonnet/astring)
[![Coverage](https://codecov.io/gh/davidbonnet/astring/branch/master/graph/badge.svg)](https://codecov.io/gh/davidbonnet/astring)
[![devDependency Status](https://david-dm.org/davidbonnet/astring/dev-status.svg)](https://david-dm.org/davidbonnet/astring?type=dev)

🌳 Tiny and fast JavaScript code generator from an [ESTree](https://github.com/estree/estree)-compliant AST.

### Key features

- Generates JavaScript code up to [version 11 (2020)](https://tc39.github.io/ecma262/) and [finished proposals](https://github.com/tc39/proposals/blob/master/finished-proposals.md).
- Works on [ESTree](https://github.com/estree/estree)-compliant ASTs such as the ones produced by [Meriyah](https://github.com/meriyah/meriyah) or [Acorn](https://github.com/acornjs/acorn).
- Extendable with custom AST node handlers.
- Considerably faster than [Bublé](https://gitlab.com/Rich-Harris/buble) (up to 5×), [Escodegen](https://github.com/estools/escodegen) (up to 10×), [Babel](https://github.com/babel/babel) (up to 50×), [UglifyJS](https://github.com/mishoo/UglifyJS2) (up to 125×), and [Prettier](https://github.com/prettier/prettier) (up to 380×).
- Supports source map generation with [Source Map](https://github.com/mozilla/source-map#sourcemapgenerator).
- Supports comment generation with [Astravel](https://github.com/davidbonnet/astravel).
- No dependencies and small footprint (≈ 16 KB minified, ≈ 4 KB gziped).

Checkout the [live demo](http://david.bonnet.cc/astring/demo/) showing Astring in action.

## Contents

<!-- MarkdownTOC autolink="true" -->

- [Installation](#installation)
- [Import](#import)
- [API](#api)
  - [`generate(node: object, options: object): string | object`](#generatenode-object-options-object-string-%7C-object)
  - [`GENERATOR: object`](#generator-object)
  - [`EXPRESSIONS_PRECEDENCE: object`](#expressions_precedence-object)
  - [`NEEDS_PARENTHESES: number`](#needs_parentheses-number)
  - [`baseGenerator: object`](#basegenerator-object)
- [Benchmark](#benchmark)
  - [Generating code](#generating-code)
  - [Parsing and generating code](#parsing-and-generating-code)
- [Examples](#examples)
  - [Generating code](#generating-code-1)
  - [Generating source maps](#generating-source-maps)
  - [Using writable streams](#using-writable-streams)
  - [Generating comments](#generating-comments)
  - [Extending](#extending)
- [Command line interface](#command-line-interface)
  - [Example](#example)

<!-- /MarkdownTOC -->

## Installation

> :warning: Astring relies on `String.prototype.repeat(amount)` and `String.prototype.endsWith(string)`. If the environment running Astring does not define these methods, use [`string.prototype.repeat`](https://www.npmjs.com/package/string.prototype.repeat), [`string.prototype.endsWith`](https://www.npmjs.com/package/string.prototype.endswith) or [`babel-polyfill`](https://www.npmjs.com/package/babel-polyfill).

Install with the [Node Package Manager](https://www.npmjs.com/package/astring):

```bash
npm install astring
```

Alternatively, checkout this repository and install the development dependencies to build the module file:

```bash
git clone https://github.com/davidbonnet/astring.git
cd astring
npm install
```

## Import

With JavaScript 6 modules:

```js
import { generate } from 'astring'
```

With CommonJS:

```js
const { generate } = require('astring')
```

A browser-ready minified bundle containing Astring is available at `dist/astring.min.js`. The module exposes a global variable `astring`:

```html
<script src="astring.min.js" type="text/javascript"></script>
<script type="text/javascript">
  var generate = astring.generate
</script>
```

## API

The `astring` module exposes the following properties:

### `generate(node: object, options: object): string | object`

Returns a string representing the rendered code of the provided AST `node`. However, if an `output` stream is provided in the `options`, it writes to that stream and returns it.

The `options` are:

- `indent`: string to use for indentation (defaults to `"␣␣"`)
- `lineEnd`: string to use for line endings (defaults to `"\n"`)
- `startingIndentLevel`: indent level to start from (defaults to `0`)
- `comments`: generate comments if `true` (defaults to `false`)
- `output`: output stream to write the rendered code to (defaults to `null`)
- `generator`: custom code generator (defaults to `GENERATOR`)
- `sourceMap`: [source map generator](https://github.com/mozilla/source-map#sourcemapgenerator) (defaults to `null`)
- `expressionsPrecedence`: custom map of node types and their precedence level (defaults to `EXPRESSIONS_PRECEDENCE`)

### `GENERATOR: object`

Base generator that can be used to [extend Astring](#extending).

### `EXPRESSIONS_PRECEDENCE: object`

Mapping of node types and their precedence level to let the generator know when to use parentheses.

### `NEEDS_PARENTHESES: number`

Default precedence level that always triggers the use of parentheses.

### `baseGenerator: object`

> :warning: Deprecated, use `GENERATOR` instead.

## Benchmark

### Generating code

Operations per second for generating each sample code from a pre-parsed AST:

| code sample (length) | escodegen |   astring |  uglify |   babel | prettier |
| :------------------- | --------: | --------: | ------: | ------: | -------: |
| tiny code (11)       | 1,257,527 | 7,185,642 | 129,467 | 156,184 |      333 |
| everything (8532)    |     1,366 |     8,008 |       0 |     346 |       64 |

### Parsing and generating code

Operations per second for parsing and generating each sample code:

| code sample (length) | acorn + astring | meriyah + astring |  buble | sucrase |
| :------------------- | --------------: | ----------------: | -----: | ------: |
| tiny code (11)       |          92,578 |           864,665 | 25,911 | 575,370 |
| everything (8532)    |             706 |             1,425 |    132 |   1,403 |

## Examples

The following examples are written in JavaScript 5 with Astring imported _à la CommonJS_.

### Generating code

This example uses [Acorn](https://github.com/acornjs/acorn), a blazingly fast JavaScript AST producer and therefore the perfect companion of Astring.

```javascript
// Make sure acorn and astring modules are imported

// Set example code
var code = 'let answer = 4 + 7 * 5 + 3;\n'
// Parse it into an AST
var ast = acorn.parse(code, { ecmaVersion: 6 })
// Format it into a code string
var formattedCode = astring.generate(ast)
// Check it
console.log(code === formattedCode ? 'It works!' : 'Something went wrong…')
```

### Generating source maps

This example uses the source map generator from the [Source Map](https://github.com/mozilla/source-map#sourcemapgenerator) module.

```javascript
// Make sure acorn, sourceMap and astring modules are imported

var code = 'function add(a, b) { return a + b; }\n'
var ast = acorn.parse(code, {
  ecmaVersion: 6,
  sourceType: 'module',
  // Locations are needed in order for the source map generator to work
  locations: true,
})
// Create empty source map generator
var map = new sourceMap.SourceMapGenerator({
  // Source file name must be set and will be used for mappings
  file: 'script.js',
})
var formattedCode = generate(ast, {
  // Enable source maps
  sourceMap: map,
})
// Display generated source map
console.log(map.toString())
```

### Using writable streams

This example for [Node](http://nodejs.org) shows how to use writable streams to get the rendered code.

```javascript
// Make sure acorn and astring modules are imported

// Set example code
var code = 'let answer = 4 + 7 * 5 + 3;\n'
// Parse it into an AST
var ast = acorn.parse(code, { ecmaVersion: 6 })
// Format it and write the result to stdout
var stream = astring.generate(ast, {
  output: process.stdout,
})
// The returned value is the output stream
console.log('Does stream equal process.stdout?', stream === process.stdout)
```

### Generating comments

Astring supports comment generation, provided they are stored on the AST nodes. To do so, this example uses [Astravel](https://github.com/davidbonnet/astravel), a fast AST traveller and modifier.

```javascript
// Make sure acorn, astravel and astring modules are imported

// Set example code
var code =
  [
    '// Compute the answer to everything',
    'let answer = 4 + 7 * 5 + 3;',
    '// Display it',
    'console.log(answer);',
  ].join('\n') + '\n'
// Parse it into an AST and retrieve the list of comments
var comments = []
var ast = acorn.parse(code, {
  ecmaVersion: 6,
  locations: true,
  onComment: comments,
})
// Attach comments to AST nodes
astravel.attachComments(ast, comments)
// Format it into a code string
var formattedCode = astring.generate(ast, {
  comments: true,
})
// Check it
console.log(code === formattedCode ? 'It works!' : 'Something went wrong…')
```

### Extending

Astring can easily be extended by updating or passing a custom code `generator`. A code `generator` consists of a mapping of node names and functions that take two arguments: `node` and `state`. The `node` points to the node from which to generate the code and the `state` exposes the `write` method that takes generated code strings.

This example shows how to support the `await` keyword which is part of the [asynchronous functions proposal](https://github.com/tc39/ecmascript-asyncawait). The corresponding `AwaitExpression` node is based on [this suggested definition](https://github.com/estree/estree/blob/master/es2017.md).

```javascript
// Make sure the astring module is imported and that `Object.assign` is defined

// Create a custom generator that inherits from Astring's base generator
var customGenerator = Object.assign({}, astring.GENERATOR, {
  AwaitExpression: function (node, state) {
    state.write('await ')
    var argument = node.argument
    if (argument != null) {
      this[argument.type](argument, state)
    }
  },
})
// Obtain a custom AST somehow (note that this AST is not obtained from a valid code)
var ast = {
  type: 'AwaitExpression',
  argument: {
    type: 'CallExpression',
    callee: {
      type: 'Identifier',
      name: 'callable',
    },
    arguments: [],
  },
}
// Format it
var code = astring.generate(ast, {
  generator: customGenerator,
})
// Check it
console.log(
  code === 'await callable();\n' ? 'It works!' : 'Something went wrong…',
)
```

## Command line interface

The `bin/astring` utility can be used to convert a JSON-formatted ESTree compliant AST of a JavaScript code. It accepts the following arguments:

- `-i`, `--indent`: string to use as indentation (defaults to `"␣␣"`)
- `-l`, `--line-end`: string to use for line endings (defaults to `"\n"`)
- `-s`, `--starting-indent-level`: indent level to start from (defaults to `0`)
- `-h`, `--help`: print a usage message and exit
- `-v`, `--version`: print package version and exit

The utility reads the AST from a provided list of files or from `stdin` if none is supplied and prints the generated code.

### Example

As in the previous example, these examples use [Acorn](https://github.com/acornjs/acorn) to get the JSON-formatted AST. This command pipes the AST output by Acorn from a `script.js` file to Astring and writes the formatted JavaScript code into a `result.js` file:

```bash
acorn --ecma6 script.js | astring > result.js
```

This command does the same, but reads the AST from an intermediary file:

```bash
acorn --ecma6 script.js > ast.json
astring ast.json > result.js
```

This command reads JavaScript 6 code from `stdin` and outputs a prettified version:

```bash
cat | acorn --ecma6 | astring
```
