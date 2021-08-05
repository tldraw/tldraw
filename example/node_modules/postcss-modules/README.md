# postcss-modules [![Build Status][ci-img]][ci]

A [PostCSS] plugin to use [CSS Modules] everywhere. Not only at the client side.

[postcss]: https://github.com/postcss/postcss
[ci-img]: https://travis-ci.org/css-modules/postcss-modules.svg
[ci]: https://travis-ci.org/css-modules/postcss-modules
[css modules]: https://github.com/css-modules/css-modules

<a href="https://evilmartians.com/?utm_source=postcss-modules">
<img src="https://evilmartians.com/badges/sponsored-by-evil-martians.svg" alt="Sponsored by Evil Martians" width="236" height="54">
</a>

What is this? For example, you have the following CSS:

```css
/* styles.css */
:global .page {
  padding: 20px;
}

.title {
  composes: title from "./mixins.css";
  color: green;
}

.article {
  font-size: 16px;
}

/* mixins.css */
.title {
  color: black;
  font-size: 40px;
}

.title:hover {
  color: red;
}
```

After the transformation it will become like this:

```css
._title_116zl_1 {
  color: black;
  font-size: 40px;
}

._title_116zl_1:hover {
  color: red;
}

.page {
  padding: 20px;
}

._title_xkpkl_5 {
  color: green;
}

._article_xkpkl_10 {
  font-size: 16px;
}
```

And the plugin will give you a JSON object for transformed classes:

```json
{
  "title": "_title_xkpkl_5 _title_116zl_1",
  "article": "_article_xkpkl_10"
}
```

## Usage

### Saving exported classes

By default, a JSON file with exported classes will be placed next to corresponding CSS.
But you have a freedom to make everything you want with exported classes, just
use the `getJSON` callback. For example, save data about classes into a corresponding JSON file:

```js
postcss([
  require("postcss-modules")({
    getJSON: function (cssFileName, json, outputFileName) {
      var path = require("path");
      var cssName = path.basename(cssFileName, ".css");
      var jsonFileName = path.resolve("./build/" + cssName + ".json");
      fs.writeFileSync(jsonFileName, JSON.stringify(json));
    },
  }),
]);
```

`getJSON` may also return a `Promise`.

### Generating scoped names

By default, the plugin assumes that all the classes are local. You can change
this behaviour using the `scopeBehaviour` option:

```js
postcss([
  require("postcss-modules")({
    scopeBehaviour: "global", // can be 'global' or 'local',
  }),
]);
```

To define paths for global modules, use the `globalModulePaths` option.
It is an array with regular expressions defining the paths:

```js
postcss([
  require('postcss-modules')({
    globalModulePaths: [/path\/to\/legacy-styles/, /another\/paths/],
  });
]);
```

To generate custom classes, use the `generateScopedName` callback:

```js
postcss([
  require("postcss-modules")({
    generateScopedName: function (name, filename, css) {
      var path = require("path");
      var i = css.indexOf("." + name);
      var line = css.substr(0, i).split(/[\r\n]/).length;
      var file = path.basename(filename, ".css");

      return "_" + file + "_" + line + "_" + name;
    },
  }),
]);
```

Or just pass an interpolated string to the `generateScopedName` option
(More details [here](https://github.com/webpack/loader-utils#interpolatename)):

```js
postcss([
  require("postcss-modules")({
    generateScopedName: "[name]__[local]___[hash:base64:5]",
  }),
]);
```

It's possible to add custom hash to generate more unique classes using the `hashPrefix` option (like in [css-loader](https://webpack.js.org/loaders/css-loader/#hashprefix)):

```js
postcss([
  require("postcss-modules")({
    generateScopedName: "[name]__[local]___[hash:base64:5]",
    hashPrefix: "prefix",
  }),
]);
```

### Exporting globals

If you need to export global names via the JSON object along with the local ones, add the `exportGlobals` option:

```js
postcss([
  require("postcss-modules")({
    exportGlobals: true,
  }),
]);
```

### Loading source files

If you need, you can pass a custom loader (see [FileSystemLoader] for example):

```js
postcss([
  require("postcss-modules")({
    Loader: CustomLoader,
  }),
]);
```

You can also pass any needed root path:

```js
postcss([
  require('postcss-modules')({
    root: 'C:\\',
  });
]);
```

### localsConvention

Type: `String | (originalClassName: string, generatedClassName: string, inputFile: string) => className: string`
Default: `null`

Style of exported classnames, the keys in your json.

|         Name          |    Type    | Description                                                                                      |
| :-------------------: | :--------: | :----------------------------------------------------------------------------------------------- |
|   **`'camelCase'`**   | `{String}` | Class names will be camelized, the original class name will not to be removed from the locals    |
| **`'camelCaseOnly'`** | `{String}` | Class names will be camelized, the original class name will be removed from the locals           |
|    **`'dashes'`**     | `{String}` | Only dashes in class names will be camelized                                                     |
|  **`'dashesOnly'`**   | `{String}` | Dashes in class names will be camelized, the original class name will be removed from the locals |

In lieu of a string, a custom function can generate the exported class names.

## Integration with templates

The plugin only transforms CSS classes to CSS modules.
But you probably want to integrate these CSS modules with your templates.
Here are some examples.

Assume you've saved project's CSS modules in `cssModules.json`:

```json
{
  "title": "_title_xkpkl_5 _title_116zl_1",
  "article": "_article_xkpkl_10"
}
```

### Pug (ex-Jade)

Let's say you have a Pug template `about.jade`:

```jade
h1(class=css.title) postcss-modules
article(class=css.article) A PostCSS plugin to use CSS Modules everywhere
```

Render it:

```js
var jade = require("jade");
var cssModules = require("./cssModules.json");
var html = jade.compileFile("about.jade")({ css: cssModules });
console.log(html);
```

And you'll get the following HTML:

```html
<h1 class="_title_xkpkl_5 _title_116zl_1">postcss-modules</h1>
<article class="_article_xkpkl_10">
  A PostCSS plugin to use CSS Modules everywhere
</article>
```

### HTML

For HTML transformation we'll use [PostHTML](https://github.com/posthtml/posthtml) and [PostHTML CSS Modules](https://github.com/maltsev/posthtml-css-modules):

```bash
npm install --save posthtml posthtml-css-modules
```

Here is our template `about.html`:

```html
<h1 css-module="title">postcss-modules</h1>
<article css-module="article">
  A PostCSS plugin to use CSS Modules everywhere
</article>
```

Transform it:

```js
var fs = require("fs");
var posthtml = require("posthtml");
var posthtmlCssModules = require("posthtml-css-modules");
var template = fs.readFileSync("./about.html", "utf8");

posthtml([posthtmlCssModules("./cssModules.json")])
  .process(template)
  .then(function (result) {
    console.log(result.html);
  });
```

(for using other build systems please check [the documentation of PostHTML](https://github.com/posthtml/posthtml/blob/master/README.md))

And you'll get the following HTML:

```html
<h1 class="_title_xkpkl_5 _title_116zl_1">postcss-modules</h1>
<article class="_article_xkpkl_10">
  A PostCSS plugin to use CSS Modules everywhere
</article>
```

## May I see the plugin in action?

Sure! Take a look at the [example](https://github.com/outpunk/postcss-modules-example).

See [PostCSS] docs for examples for your environment and don't forget to run

```
npm install --save-dev postcss-modules
```

[filesystemloader]: https://github.com/css-modules/css-modules-loader-core/blob/master/src/file-system-loader.js
