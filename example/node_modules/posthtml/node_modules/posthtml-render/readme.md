[![npm][npm]][npm-url]
[![node]]()
[![tests][tests]][tests-url]
[![coverage][cover]][cover-url]

<div align="center">
  <a href="https://github.com/posthtml/posthtml">
    <img width="200" height="200" alt="PostHTML"
      src="http://posthtml.github.io/posthtml/logo.svg">
  </a>
  <h1>PostHTML Render</h1>
  <p>Renders a PostHTML Tree to HTML/XML</p>
</div>

<h2 align="center">Install</h2>

```bash
npm i -D posthtml-render
```

<h2 align="center">Usage</h2>

### `NodeJS`

```js
import { render } from ''posthtml-render;

const tree = [];

const node = {};

node.tag = 'ul';
node.attrs = { class: 'list' };
node.content = [
 'one',
 'two',
 'three'
].map((content) => ({ tag: 'li', content }));

tree.push(node);

const html = render(tree, options);

```

```html
<ul class="list">
  <li>one</li>
  <li>two</li>
  <li>three</li>
</ul>
```

<h2 align="center">Options</h2>

|Name|Type|Default|Description|
|:--:|:--:|:-----:|:----------|
|**[`singleTags`](#singletags)**|`{Array<String\|RegExp>}`|`[]`|Specify custom single tags (self closing)|
|**[`closingSingleTag`](#closingSingleTag)**|`{String}`|[`>`](#default)|Specify the single tag closing format|
|**[`quoteAllAttributes`](#quoteAllAttributes)**|`{Boolean}`|[`true`](#default)|Put double quotes around all tags, even when not necessary.|
|**[`replaceQuote`](#replaceQuote)**|`{Boolean}`|[`true`](#default)|Replaces quotes in attribute values with `&quote;`.|
|**[`quoteStyle`](#quoteStyle)**|`{0 or 1 or 2}`|[`2`](#default)|Specify the style of quote arround the attribute values|

### `singleTags`

Specify custom single tags (self closing)

### `{String}`

```js
const render = require('posthtml-render')

const tree = [ { tag: 'name' } ]
const options = { singleTags: [ 'name' ] }

const html = render(tree, options)
```

**result.html**
```html
<name>
```

#### `{RegExp}`

```js
const render = require('posthtml-render')

const tree = [ { tag: '%=title%' } ]
const options = { singleTags: [ /^%.*%$/ ] }

const html = render(tree, options)
```

**result.html**
```html
<%=title%>
```

### `closingSingleTag`

Specify the single tag closing format

#### `Formats`

```js
const render = require('posthtml-render')

const tree = [ { tag: 'img' } ]
```

##### `'tag'`

```js
const html = render(tree, { closingSingleTag: 'tag' })
```

```html
<custom></custom>
```

##### `'slash'`

```js
const html = render(tree, { closingSingleTag: 'slash' })
```

```html
<custom />
```

##### `'default' (Default)`

```js
const html = render(tree)
```

```html
<img>
```

##### `'closeAs'`

```js
const tree = [ {
  tag: 'custom',
  closeAs: 'default' // Available types: `tag` | `slash` | `default`
} ]
const html = render(tree, { closingSingleTag: 'closeAs' })
```

```html
<custom>
```

### `quoteAllAttributes`

Specify if all attributes should be quoted.

##### `true (Default)`

```html
<i src="index.js"></i>
```

##### `false`

```html
<i src=index.js></i>
```

### `replaceQuote`

Replaces quotes in attribute values with `&quote;`.

##### `true (Default)`

```html
<img src="<?php echo $foo[&quote;bar&quote;] ?>">
```

##### `false`

```html
<img src="<?php echo $foo["bar"] ?>">
```

### `quoteStyle`

##### `2 (Default)`

Attribute values are wrapped in double quotes:

```html
<img src="https://example.com/example.png" onload="testFunc("test")">
```

##### `1`

Attribute values are wrapped in single quote:

```html
<img src='https://example.com/example.png' onload='testFunc("test")'>
```

##### `0`

Quote style is based on attribute values (an alternative for `replaceQuote` option):

```html
<img src="https://example.com/example.png" onload='testFunc("test")'>
```


[npm]: https://img.shields.io/npm/v/posthtml-render.svg
[npm-url]: https://npmjs.com/package/posthtml-render

[node]: https://img.shields.io/node/v/posthtml-render.svg
[node-url]: https://img.shields.io/node/v/posthtml-render.svg

[tests]: http://img.shields.io/travis/posthtml/posthtml-render.svg
[tests-url]: https://travis-ci.org/posthtml/posthtml-render

[cover]: https://coveralls.io/repos/github/posthtml/posthtml-render/badge.svg
[cover-url]: https://coveralls.io/github/posthtml/posthtml-render
