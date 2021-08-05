# lowlight

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]

Virtual syntax highlighting for virtual DOMs and non-HTML things, with language
auto-detection.
Perfect for [React][], [VDOM][], and others.

Lowlight is built to work with all syntaxes supported by [highlight.js][],
that’s [190 languages][names] (and all 94 themes).

Want to use [Prism][] instead?
Try [`refractor`][refractor]!

## Contents

*   [Install](#install)
*   [Use](#use)
*   [API](#api)
    *   [`low.highlight(language, value[, options])`](#lowhighlightlanguage-value-options)
    *   [`low.highlightAuto(value[, options])`](#lowhighlightautovalue-options)
    *   [`Result`](#result)
    *   [`low.registerLanguage(name, syntax)`](#lowregisterlanguagename-syntax)
    *   [`low.registerAlias(name[, alias])`](#lowregisteraliasname-alias)
    *   [`low.listLanguages()`](#lowlistlanguages)
*   [Browser](#browser)
*   [Related](#related)
*   [Projects](#projects)
*   [License](#license)

## Install

[npm][]:

```sh
npm install lowlight
```

[Usage in the browser »][browser]

## Use

Highlight:

```js
var low = require('lowlight')
var tree = low.highlight('js', '"use strict";').value

console.log(tree)
```

Yields:

```js
[
  {
    type: 'element',
    tagName: 'span',
    properties: {className: ['hljs-meta']},
    children: [{type: 'text', value: '"use strict"'}]
  },
  {type: 'text', value: ';'}
]
```

Or, serialized with [rehype-stringify][]:

```js
var unified = require('unified')
var rehypeStringify = require('rehype-stringify')

var processor = unified().use(rehypeStringify)
var html = processor.stringify({type: 'root', children: tree}).toString()

console.log(html)
```

Yields:

```html
<span class="hljs-meta">"use strict"</span>;
```

> **Tip**: Use [`hast-to-hyperscript`][to-hyperscript] to transform to other
> virtual DOMs, or DIY.

## API

### `low.highlight(language, value[, options])`

Parse `value` (`string`) according to the [`language`][names] grammar.

###### `options`

*   `prefix` (`string?`, default: `'hljs-'`) — Class prefix

###### Returns

[`Result`][result].

###### Example

```js
var low = require('lowlight')

console.log(low.highlight('css', 'em { color: red }'))
```

Yields:

```js
{relevance: 4, language: 'css', value: [Array]}
```

### `low.highlightAuto(value[, options])`

Parse `value` by guessing its grammar.

###### `options`

*   `prefix` (`string?`, default: `'hljs-'`)
    — Class prefix
*   `subset` (`Array.<string>?` default: all registered languages)
    — List of allowed languages

###### Returns

[`Result`][result], with a `secondBest` if found.

###### Example

```js
var low = require('lowlight')

console.log(low.highlightAuto('"hello, " + name + "!"'))
```

Yields:

```js
{
  relevance: 3,
  language: 'applescript',
  value: [Array],
  secondBest: {relevance: 3, language: 'basic', value: [Array]}
}
```

### `Result`

`Result` is a highlighting result object.

###### Properties

*   `relevance` (`number`)
    — How sure **low** is that the given code is in the found language
*   `language` (`string`)
    — The detected `language`
*   `value` ([`Array.<Node>`][hast-node])
    — Virtual nodes representing the highlighted given code
*   `secondBest` ([`Result?`][result])
    — Result of the second-best (based on `relevance`) match.
    Only set by `highlightAuto`, but can still be `null`.

### `low.registerLanguage(name, syntax)`

Register a [syntax][] as `name` (`string`).
Useful in the browser or with custom grammars.

###### Example

```js
var low = require('lowlight/lib/core')
var xml = require('highlight.js/lib/languages/xml')

low.registerLanguage('xml', xml)

console.log(low.highlight('html', '<em>Emphasis</em>'))
```

Yields:

```js
{relevance: 2, language: 'html', value: [Array]}
```

### `low.registerAlias(name[, alias])`

Register a new `alias` for the `name` language.

###### Signatures

*   `registerAlias(name, alias|list)`
*   `registerAlias(aliases)`

###### Parameters

*   `name` (`string`) — [Name][names] of a registered language
*   `alias` (`string`) — New alias for the registered language
*   `list` (`Array.<alias>`) — List of aliases
*   `aliases` (`Object.<alias|list>`) — Map where each key is a `name` and each
    value an `alias` or a `list`

###### Example

```js
var low = require('lowlight/lib/core')
var md = require('highlight.js/lib/languages/markdown')

low.registerLanguage('markdown', md)

// low.highlight('mdown', '<em>Emphasis</em>')
// ^ would throw: Error: Unknown language: `mdown` is not registered

low.registerAlias({markdown: ['mdown', 'mkdn', 'mdwn', 'ron']})
low.highlight('mdown', '<em>Emphasis</em>')
// ^ Works!
```

### `low.listLanguages()`

List all registered languages.

###### Returns

`Array.<string>`.

###### Example

```js
var low = require('lowlight/lib/core')
var md = require('highlight.js/lib/languages/markdown')

console.log(low.listLanguages()) // => []

low.registerLanguage('markdown', md)

console.log(low.listLanguages()) // => ['markdown']
```

## Browser

It is not suggested to use the pre-built files or requiring `lowlight` in the
browser as that would include 916kB (260kB GZipped) of code.

Instead, require `lowlight/lib/core`, and include only the used highlighters.
For example:

```js
var low = require('lowlight/lib/core')
var js = require('highlight.js/lib/languages/javascript')

low.registerLanguage('javascript', js)

low.highlight('js', '"use strict";')
// See `Usage` for the results.
```

…when using [browserify][] and minifying with [tinyify][] this results in 24kB
of code (9kB with GZip).

## Related

*   [`refractor`][refractor] — Same, but based on [Prism][]

## Projects

*   [`emphasize`](https://github.com/wooorm/emphasize)
    — Syntax highlighting in ANSI, for the terminal
*   [`react-lowlight`](https://github.com/rexxars/react-lowlight)
    — Syntax highlighter for [React][]
*   [`react-syntax-highlighter`](https://github.com/conorhastings/react-syntax-highlighter)
    — [React][] component for syntax highlighting
*   [`rehype-highlight`](https://github.com/rehypejs/rehype-highlight)
    — Syntax highlighting in [**rehype**](https://github.com/rehypejs/rehype)
*   [`remark-highlight.js`](https://github.com/ben-eb/remark-highlight.js)
    — Syntax highlighting in [**remark**](https://github.com/remarkjs/remark)
*   [`jstransformer-lowlight`](https://github.com/ai/jstransformer-lowlight)
    — Syntax highlighting for [JSTransformers](https://github.com/jstransformers)
    and [Pug](https://pugjs.org/language/filters.html)

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definitions -->

[build-badge]: https://github.com/wooorm/lowlight/workflows/main/badge.svg

[build]: https://github.com/wooorm/lowlight/actions

[coverage-badge]: https://img.shields.io/codecov/c/github/wooorm/lowlight.svg

[coverage]: https://codecov.io/github/wooorm/lowlight

[downloads-badge]: https://img.shields.io/npm/dm/lowlight.svg

[downloads]: https://www.npmjs.com/package/lowlight

[size-badge]: https://img.shields.io/bundlephobia/minzip/lowlight.svg

[size]: https://bundlephobia.com/result?p=lowlight

[npm]: https://docs.npmjs.com/cli/install

[license]: license

[author]: https://wooorm.com

[rehype-stringify]: https://github.com/rehypejs/rehype/tree/main/packages/rehype-stringify

[hast-node]: https://github.com/syntax-tree/hast#ast

[highlight.js]: https://github.com/highlightjs/highlight.js

[syntax]: https://github.com/highlightjs/highlight.js/blob/master/docs/language-guide.rst

[names]: https://github.com/highlightjs/highlight.js/blob/master/SUPPORTED_LANGUAGES.md

[react]: https://facebook.github.io/react/

[vdom]: https://github.com/Matt-Esch/virtual-dom

[to-hyperscript]: https://github.com/syntax-tree/hast-to-hyperscript

[browser]: #browser

[result]: #result

[prism]: https://github.com/PrismJS/prism

[refractor]: https://github.com/wooorm/refractor

[browserify]: https://github.com/browserify/browserify

[tinyify]: https://github.com/browserify/tinyify
