[![NPM][npm]][npm-url]
[![Deps][deps]][deps-url]
[![Tests][build]][build-url]
[![Coverage][cover]][cover-url]
[![Standard Code Style][code-style]][code-style-url]
[![Twitter][twitter]][twitter-url]

# PostHTML <img align="right" width="220" height="200" title="PostHTML" src="http://posthtml.github.io/posthtml/logo.svg">

PostHTML is a tool for transforming HTML/XML with JS plugins. PostHTML itself is very small. It includes only a HTML parser, a HTML node tree API and a node tree stringifier.

All HTML transformations are made by plugins. And these plugins are just small plain JS functions, which receive a HTML node tree, transform it, and return a modified tree.

For more detailed information about PostHTML in general take a look at the [docs][docs-url].

### Dependencies

| Name | Status | Description |
|:----:|:------:|:-----------:|
|[posthtml-parser][parser]|[![npm][parser-badge]][parser-npm]| Parser HTML/XML to PostHTMLTree |
|[posthtml-render][render]|[![npm][render-badge]][render-npm]| Render PostHTMLTree to HTML/XML |


[docs]: https://github.com/posthtml/posthtml/blob/master/docs

[parser]: https://github.com/posthtml/posthtml-parser
[parser-badge]: https://img.shields.io/npm/v/posthtml-parser.svg
[parser-npm]: https://npmjs.com/package/posthtml-parser

[render]: https://github.com/posthtml/posthtml-render
[render-badge]: https://img.shields.io/npm/v/posthtml-render.svg
[render-npm]: https://npmjs.com/package/posthtml-render

## Create to your project

```bash
npm init posthtml
```

## Install

```bash
npm i -D posthtml
```

## Usage

### API

**Sync**

```js
import posthtml from 'posthtml'

const html = `
  <component>
    <title>Super Title</title>
    <text>Awesome Text</text>
  </component>
`

const result = posthtml()
  .use(require('posthtml-custom-elements')())
  .process(html, { sync: true })
  .html

console.log(result)
```

```html
<div class="component">
  <div class="title">Super Title</div>
  <div class="text">Awesome Text</div>
</div>
```

> :warning: Async Plugins can't be used in sync mode and will throw an Error. It's recommended to use PostHTML asynchronously whenever possible.

**Async**

```js
import posthtml from 'posthtml'

const html = `
  <html>
    <body>
      <p class="wow">OMG</p>
    </body>
  </html>
`

posthtml(
  [
    require('posthtml-to-svg-tags')(),
    require('posthtml-extend-attrs')({
      attrsTree: {
        '.wow' : {
          id: 'wow_id',
          fill: '#4A83B4',
          'fill-rule': 'evenodd',
          'font-family': 'Verdana'
        }
      }
    })
  ])
  .process(html/*, options */)
  .then((result) =>  console.log(result.html))
```

```html
<svg xmlns="http://www.w3.org/2000/svg">
  <text
    class="wow"
    id="wow_id"
    fill="#4A83B4"
    fill-rule="evenodd" font-family="Verdana">
      OMG
  </text>
</svg>
```

**Directives**

```js
import posthtml from 'posthtml'

const php = `
  <component>
    <title><?php echo $title; ?></title>
    <text><?php echo $article; ?></text>
  </component>
`

const result = posthtml()
  .use(require('posthtml-custom-elements')())
  .process(html, {
    directives: [
      { name: '?php', start: '<', end: '>' }
    ]
  })
  .html

console.log(result)
```

```html
<div class="component">
  <div class="title"><?php echo $title; ?></div>
  <div class="text"><?php echo $article; ?></div>
</div>
```

### [CLI](https://npmjs.com/package/posthtml-cli)

```bash
npm i posthtml-cli
```

```json
"scripts": {
  "posthtml": "posthtml -o output.html -i input.html -c config.json"
}
```

```bash
npm run posthtml
```

### [Gulp](https://gulpjs.com)

```bash
npm i -D gulp-posthtml
```

```js
import tap from 'gulp-tap'
import posthtml from 'gulp-posthtml'
import { task, src, dest } from 'gulp'

task('html', () => {
  let path

  const plugins = [ require('posthtml-include')({ root: `${path}` }) ]
  const options = {}

  src('src/**/*.html')
    .pipe(tap((file) => path = file.path))
    .pipe(posthtml(plugins, options))
    .pipe(dest('build/'))
})
```

Check [project-stub](https://github.com/posthtml/project-stub) for an example with Gulp

### [Grunt](https://gruntjs.com)

```bash
npm i -D grunt-posthtml
```

```js
posthtml: {
  options: {
    use: [
      require('posthtml-doctype')({ doctype: 'HTML 5' }),
      require('posthtml-include')({ root: './', encoding: 'utf-8' })
    ]
  },
  build: {
    files: [
      {
        dot: true,
        cwd: 'html/',
        src: ['*.html'],
        dest: 'tmp/',
        expand: true,
      }
    ]
  }
}
```

### [Webpack](https://webpack.js.org)

```bash
npm i -D html-loader posthtml-loader
```

#### v1.x

**webpack.config.js**

```js
const config = {
  module: {
    loaders: [
      {
        test: /\.html$/,
        loader: 'html!posthtml'
      }
    ]
  },
  posthtml: (ctx) => ({
    parser: require('posthtml-pug'),
    plugins: [
      require('posthtml-bem')()
    ]
  })
}

export default config
```

#### v2.x

**webpack.config.js**

```js
import { LoaderOptionsPlugin } from 'webpack'

const config = {
  module: {
    rules: [
      {
        test: /\.html$/,
        use: [
          {
            loader: 'html-loader',
            options: { minimize: true }
          },
          {
            loader: 'posthtml-loader'
          }
        ]
      }
    ]
  },
  plugins: [
    new LoaderOptionsPlugin({
      options: {
        posthtml(ctx) {
          return {
            parser: require('posthtml-pug'),
            plugins: [
              require('posthtml-bem')()
            ]
          }
        }
      }
    })
  ]
}

export default config
```

### [Rollup](https://rollupjs.org/)

```bash
$ npm i rollup-plugin-posthtml -D
# or
$ npm i rollup-plugin-posthtml-template -D
```

```js
import { join } from 'path';

import posthtml from 'rollup-plugin-posthtml-template';
// or
// import posthtml from 'rollup-plugin-posthtml';

import sugarml from 'posthtml-sugarml';  // npm i posthtml-sugarml -D
import include from 'posthtml-include';  // npm i posthtml-include -D

export default {
  entry: join(__dirname, 'main.js'),
  dest: join(__dirname, 'bundle.js'),
  format: 'iife',
  plugins: [
    posthtml({
      parser: sugarml(),
      plugins: [include()],
      template: true  // only rollup-plugin-posthtml-template
    })
  ]
};
```

## Parser

```js
import pug from 'posthtml-pug'

posthtml().process(html, { parser: pug(options) }).then((result) => result.html)
```

| Name |Status|Description|
|:-----|:-----|:----------|
|[posthtml-pug][pug]|[![npm][pug-badge]][pug-npm]|Pug Parser|
|[sugarml][sugar]|[![npm][sugar-badge]][sugar-npm]|SugarML Parser|


[pug]: https://github.com/posthtml/posthtml-pug
[pug-badge]: https://img.shields.io/npm/v/posthtml-pug.svg
[pug-npm]: https://npmjs.com/package/posthtml-pug

[sugar]: https://github.com/posthtml/sugarml
[sugar-badge]: https://img.shields.io/npm/v/sugarml.svg
[sugar-npm]: https://npmjs.com/package/sugarml

## [Plugins](http://maltsev.github.io/posthtml-plugins)

In case you want to develop your own plugin, we recommend using [posthtml-plugin-starter][plugin] to get started.

[plugin]: https://github.com/posthtml/posthtml-plugin-starter

#### TEXT

| Name |Status|Description|
|:-----|:-----|:----------|
|[posthtml-md][md]|[![npm][md-badge]][md-npm]|Easily use context-sensitive markdown within HTML|
|[posthtml-toc][toc]|[![npm][toc-badge]][toc-npm]|Table of contents|
|[posthtml-lorem][lorem]|[![npm][lorem-badge]][lorem-npm]|Add lorem ipsum placeholder text to any document|
|[posthtml-retext][text]|[![npm][text-badge]][text-npm]|Extensible system for analysing and manipulating natural language|
|[prevent-widows][prevent-widows]|[![npm][prevent-widows-badge]][prevent-widows-npm]|Prevent widows from appearing at the end of paragraphs|
|[posthtml-richtypo][richtypo]|[![npm][richtypo-badge]][richtypo-npm]|Process HTML node text with Richtypo|

[md]: https://github.com/jonathantneal/posthtml-md
[md-badge]: https://img.shields.io/npm/v/posthtml-md.svg
[md-npm]: https://npmjs.com/package/posthtml-md

[toc]: https://github.com/posthtml/posthtml-toc
[toc-badge]: https://img.shields.io/npm/v/posthtml-toc.svg
[toc-npm]: https://npmjs.com/package/posthtml-toc

[text]: https://github.com/voischev/posthtml-retext
[text-badge]: https://img.shields.io/npm/v/posthtml-retext.svg
[text-npm]: https://npmjs.com/package/posthtml-retext

[lorem]: https://github.com/jonathantneal/posthtml-lorem
[lorem-badge]: https://img.shields.io/npm/v/posthtml-lorem.svg
[lorem-npm]: https://npmjs.com/package/posthtml-lorem

[prevent-widows]: https://github.com/bashaus/prevent-widows
[prevent-widows-badge]: https://img.shields.io/npm/v/prevent-widows.svg
[prevent-widows-npm]: https://npmjs.com/package/prevent-widows

[richtypo]: https://github.com/Grawl/posthtml-richtypo
[richtypo-badge]: https://img.shields.io/npm/v/posthtml-richtypo.svg
[richtypo-npm]: https://npmjs.com/package/posthtml-richtypo

#### HTML

|Name|Status|Description|
|:---|:----:|:----------|
|[posthtml-doctype][doctype]|[![npm][doctype-badge]][doctype-npm]|Set !DOCTYPE|
|[posthtml-head-elements][head]|[![npm][head-badge]][head-npm]|Include head elements from JSON file|
|[posthtml-include][include]|[![npm][include-badge]][include-npm]|Include HTML|
|[posthtml-modules][modules]|[![npm][modules-badge]][modules-npm]|Include and process HTML|
|[posthtml-extend][extend]|[![npm][extend-badge]][extend-npm]|Extend Layout (Pug-like)|
|[posthtml-extend-attrs][attrs]|[![npm][attrs-badge]][attrs-npm]|Extend Attrs|
|[posthtml-expressions][exp]|[![npm][exp-badge]][exp-npm]|Template Expressions|
|[posthtml-inline-assets][assets]|[![npm][assets-badge]][assets-npm]|Inline external scripts, styles, and images|
|[posthtml-static-react][react]|[![npm][react-badge]][react-npm]| Render custom elements as static React components|
|[posthtml-custom-elements][elem]|[![npm][elem-badge]][elem-npm]|Use custom elements|
|[posthtml-web-component][web]|[![npm][web-badge]][web-npm]|Web Component server-side rendering, Component as a Service (CaaS)|
|[posthtml-spaceless][spaceless]|[![npm][spaceless-badge]][spaceless-npm]|Remove whitespace between HTML tags|
|[posthtml-cache][cache]|[![npm][cache-badge]][cache-npm]|Add a nanoid to links in your tags|
|[posthtml-highlight][highlight]|[![npm][highlight-badge]][highlight-npm]|Syntax highlight code elements|
|[posthtml-pseudo][pseudo]|[![npm][pseudo-badge]][pseudo-npm]|Add pseudo selector class names to elements|
|[posthtml-noopener][noopener]|[![npm][noopener-badge]][noopener-npm]|Add rel="noopener noreferrer" to links that open in new tab|
|[posthtml-noscript][noscript]|[![npm][noscript-badge]][noscript-npm]|Insert noscript content when JavaScript is disabled|
|[posthtml-hash][hash]|[![npm][hash-badge]][hash-npm]|Hash static CSS/JS assets|
|[posthtml-insert-at][insert-at]|[![npm][insert-at-badge]][insert-at-npm]|Append/prepend HTML to a selector|
|[posthtml-plugin-remove-duplicates][plugin-remove-duplicates]|[![npm][plugin-remove-duplicates-badge]][plugin-remove-duplicates-npm]|Remove duplicated tags|
|[posthtml-plugin-link-preload][plugin-link-preload]|[![npm][plugin-link-preload-badge]][plugin-link-preload-npm]|Add preload/prefetch tags (or return equivalent headers)|
|[posthtml-prism][prism]|[![npm][prism-badge]][prism-npm]|Code syntax highlighting with Prism|
|[posthtml-url-parameters][url-parameters]|[![npm][url-parameters-badge]][url-parameters-npm]|Add parameters to URLs|
|[posthtml-safe-class-names][safe-class-names]|[![npm][safe-class-names-badge]][safe-class-names-npm]|Replace escaped characters in class names and CSS selectors|
|[posthtml-fetch][fetch]|[![npm][fetch-badge]][fetch-npm]|Fetch and render remote content|
|[posthtml-mso][mso]|[![npm][mso-badge]][mso-npm]|Makes it easy to write Outlook conditionals in HTML emails|
|[posthtml-postcss-merge-longhand][longhand]|[![npm][longhand-badge]][longhand-npm]|Merge longhand inline CSS into shorthand|
|[posthtml-markdownit][markdownit]|[![npm][markdownit-badge]][markdownit-npm]|Transform Markdown using markdown-it|
|[posthtml-extra-attributes][extra-attributes]|[![npm][extra-attributes-badge]][extra-attributes-npm]|Add new attributes to elements in your HTML|
|[posthtml-sri][sri]|[![npm][sri-badge]][sri-npm]|Adds subresource integrity (SRI) attributes.|


[cache]: https://github.com/posthtml/posthtml-cache
[cache-badge]: https://img.shields.io/npm/v/posthtml-cache.svg
[cache-npm]: https://npmjs.com/package/posthtml-cache

[spaceless]: https://github.com/posthtml/posthtml-spaceless
[spaceless-badge]: https://img.shields.io/npm/v/posthtml-spaceless.svg
[spaceless-npm]: https://npmjs.com/package/posthtml-spaceless

[doctype]: https://github.com/posthtml/posthtml-doctype
[doctype-badge]: https://img.shields.io/npm/v/posthtml-doctype.svg
[doctype-npm]: https://npmjs.com/package/posthtml-doctype

[head]: https://github.com/TCotton/posthtml-head-elements
[head-badge]: https://img.shields.io/npm/v/posthtml-head-elements.svg
[head-npm]: https://npmjs.com/package/posthtml-head-elements

[include]: https://github.com/posthtml/posthtml-include
[include-badge]: https://img.shields.io/npm/v/posthtml-include.svg
[include-npm]: https://npmjs.com/package/posthtml-include

[modules]: https://github.com/posthtml/posthtml-modules
[modules-badge]: https://img.shields.io/npm/v/posthtml-modules.svg
[modules-npm]: https://npmjs.com/package/posthtml-modules

[content]: https://github.com/posthtml/posthtml-content
[content-badge]: https://img.shields.io/npm/v/posthtml-content.svg
[content-npm]: https://npmjs.com/package/posthtml-content

[exp]: https://github.com/posthtml/posthtml-exp
[exp-badge]: https://img.shields.io/npm/v/posthtml-exp.svg
[exp-npm]: https://npmjs.com/package/posthtml-exp

[extend]: https://github.com/posthtml/posthtml-extend
[extend-badge]: https://img.shields.io/npm/v/posthtml-extend.svg
[extend-npm]: https://npmjs.com/package/posthtml-extend

[attrs]: https://github.com/theprotein/posthtml-extend-attrs
[attrs-badge]: https://img.shields.io/npm/v/posthtml-extend-attrs.svg
[attrs-npm]: https://npmjs.com/package/posthtml-extend-attrs

[assets]: https://github.com/jonathantneal/posthtml-inline-assets
[assets-badge]: https://img.shields.io/npm/v/posthtml-inline-assets.svg
[assets-npm]: https://npmjs.com/package/posthtml-inline-assets

[elem]: https://github.com/posthtml/posthtml-custom-elements
[elem-badge]: https://img.shields.io/npm/v/posthtml-custom-elements.svg
[elem-npm]: https://npmjs.com/package/posthtml-custom-elements

[web]: https://github.com/island205/posthtml-web-component
[web-badge]: https://img.shields.io/npm/v/posthtml-web-component.svg
[web-npm]: https://npmjs.com/package/posthtml-web-components

[prefix]: https://github.com/stevenbenisek/posthtml-prefix-class
[prefix-badge]: https://img.shields.io/npm/v/posthtml-prefix-class.svg
[prefix-npm]: https://npmjs.com/package/posthtml-prefix-class

[react]: https://github.com/rasmusfl0e/posthtml-static-react
[react-badge]: https://img.shields.io/npm/v/posthtml-static-react.svg
[react-npm]: https://npmjs.com/package/posthtml-static-react

[highlight]: https://github.com/caseyWebb/posthtml-highlight
[highlight-badge]: https://img.shields.io/npm/v/posthtml-highlight.svg
[highlight-npm]: https://npmjs.com/package/posthtml-highlight

[pseudo]: https://github.com/kevinkace/posthtml-pseudo
[pseudo-badge]: https://img.shields.io/npm/v/posthtml-pseudo.svg
[pseudo-npm]: https://npmjs.com/package/posthtml-pseudo

[noopener]: https://github.com/posthtml/posthtml-noopener
[noopener-badge]: https://img.shields.io/npm/v/posthtml-noopener.svg
[noopener-npm]: https://npmjs.com/package/posthtml-noopener

[noscript]: https://github.com/posthtml/posthtml-noscript
[noscript-badge]: https://img.shields.io/npm/v/posthtml-noscript.svg
[noscript-npm]: https://npmjs.com/package/posthtml-noscript

[hash]: https://github.com/posthtml/posthtml-hash
[hash-badge]: https://img.shields.io/npm/v/posthtml-hash.svg
[hash-npm]: https://npmjs.com/package/posthtml-hash

[insert-at]: https://github.com/posthtml/posthtml-insert-at
[insert-at-badge]: https://img.shields.io/npm/v/posthtml-insert-at.svg
[insert-at-npm]: https://npmjs.com/package/posthtml-insert-at

[plugin-remove-duplicates]: https://github.com/sithmel/posthtml-plugin-remove-duplicates
[plugin-remove-duplicates-badge]: https://img.shields.io/npm/v/posthtml-plugin-remove-duplicates.svg
[plugin-remove-duplicates-npm]: https://npmjs.com/package/posthtml-plugin-remove-duplicates

[plugin-link-preload]: https://github.com/sithmel/posthtml-plugin-link-preload
[plugin-link-preload-badge]: https://img.shields.io/npm/v/posthtml-plugin-link-preload.svg
[plugin-link-preload-npm]: https://npmjs.com/package/posthtml-plugin-link-preload

[prism]: https://github.com/posthtml/posthtml-prism
[prism-badge]: https://img.shields.io/npm/v/posthtml-prism.svg
[prism-npm]: https://npmjs.com/package/posthtml-prism

[url-parameters]: https://github.com/posthtml/posthtml-url-parameters
[url-parameters-badge]: https://img.shields.io/npm/v/posthtml-url-parameters.svg
[url-parameters-npm]: https://npmjs.com/package/posthtml-url-parameters

[safe-class-names]: https://github.com/posthtml/posthtml-safe-class-names
[safe-class-names-badge]: https://img.shields.io/npm/v/posthtml-safe-class-names.svg
[safe-class-names-npm]: https://npmjs.com/package/posthtml-safe-class-names

[fetch]: https://github.com/posthtml/posthtml-fetch
[fetch-badge]: https://img.shields.io/npm/v/posthtml-fetch.svg
[fetch-npm]: https://npmjs.com/package/posthtml-fetch

[mso]: https://github.com/posthtml/posthtml-mso
[mso-badge]: https://img.shields.io/npm/v/posthtml-mso.svg
[mso-npm]: https://npmjs.com/package/posthtml-mso

[longhand]: https://github.com/posthtml/posthtml-postcss-merge-longhand
[longhand-badge]: https://img.shields.io/npm/v/posthtml-postcss-merge-longhand.svg
[longhand-npm]: https://npmjs.com/package/posthtml-postcss-merge-longhand

[markdownit]: https://github.com/posthtml/posthtml-markdownit
[markdownit-badge]: https://img.shields.io/npm/v/posthtml-markdownit.svg
[markdownit-npm]: https://npmjs.com/package/posthtml-markdownit

[extra-attributes]: https://github.com/posthtml/posthtml-extra-attributes
[extra-attributes-badge]: https://img.shields.io/npm/v/posthtml-extra-attributes.svg
[extra-attributes-npm]: https://npmjs.com/package/posthtml-extra-attributes

[sri]: https://gitlab.com/abogical/posthtml-sri
[sri-badge]: https://img.shields.io/npm/v/posthtml-sri.svg
[sri-npm]: https://npmjs.com/package/posthtml-sri

#### CSS

|Name|Status|Description|
|:---|:-----|:----------|
|[posthtml-bem][bem]|[![npm][bem-badge]][bem-npm]|Support BEM naming in html structure|
|[posthtml-postcss][css]|[![npm][css-badge]][css-npm]|Use [PostCSS][css-gh] in HTML document|
|[posthtml-px2rem][px2rem]|[![npm][px2rem-badge]][px2rem-npm]|Change px to rem in Inline CSS|
|[posthtml-css-modules][css-modules]|[![npm][css-modules-badge]][css-modules-npm]|Use CSS modules in HTML|
|[posthtml-postcss-modules][postcss-modules]|[![npm][postcss-modules-badge]][postcss-modules-npm]|CSS Modules in html|
|[posthtml-classes][classes]|[![npm][classes-badge]][classes-npm]|Get a list of classes from HTML|
|[posthtml-prefix-class][prefix]|[![npm][prefix-badge]][prefix-npm]|Prefix class names
|[posthtml-modular-css][modular]|[![npm][modular-badge]][modular-npm]|Make CSS modular|
|[posthtml-inline-css][in]|[![npm][in-badge]][in-npm]|CSS Inliner|
|[posthtml-collect-styles][collect-styles]|[![npm][collect-styles-badge]][collect-styles-npm]|Collect styles from html and put it in the head|
|[posthtml-collect-inline-styles][collect]|[![npm][collect-badge]][collect-npm]|Collect inline styles and insert to head tag|
|[posthtml-style-expantion][style-expantion]|[![npm][style-expantion-badge]][style-expantion-npm]| PostHTML plugin expand link rel="stylesheet".|
|[posthtml-style-to-file][style]|[![npm][style-badge]][style-npm]| Save HTML style nodes and attributes to CSS file|
|[posthtml-color-shorthand-hex-to-six-digit][hex]|[![npm][hex-badge]][hex-npm]|Enforce all hex color codes to be 6-char long|
|[posthtml-minify-classnames][minify]|[![npm][minify-badge]][minify-npm]|Rewrites classnames and ids inside of html and css files to reduce file size.|


[bem]: https://github.com/rajdee/posthtml-bem
[bem-badge]: https://img.shields.io/npm/v/posthtml-bem.svg
[bem-npm]: https://npmjs.com/package/posthtml-bem

[css]: https://github.com/posthtml/posthtml-postcss
[css-badge]: https://img.shields.io/npm/v/posthtml-postcss.svg
[css-npm]: https://npmjs.com/package/posthtml-postcss
[css-gh]: https://github.com/postcss/postcss

[postcss-modules]: https://github.com/posthtml/posthtml-postcss-modules
[postcss-modules-badge]: https://img.shields.io/npm/v/posthtml-postcss-modules.svg
[postcss-modules-npm]: https://npmjs.com/package/posthtml-postcss-modules

[css-modules]: https://github.com/posthtml/posthtml-css-modules
[css-modules-badge]: https://img.shields.io/npm/v/posthtml-css-modules.svg
[css-modules-npm]: https://npmjs.com/package/posthtml-css-modules

[collect-styles]: https://github.com/posthtml/posthtml-collect-styles
[collect-styles-badge]: https://img.shields.io/npm/v/posthtml-collect-styles.svg
[collect-styles-npm]: https://npmjs.com/package/posthtml-collect-styles

[collect]: https://github.com/totora0155/posthtml-collect-inline-styles
[collect-badge]: https://img.shields.io/npm/v/posthtml-collect-inline-styles.svg
[collect-npm]: https://npmjs.com/package/posthtml-collect-inline-styles

[px2rem]: https://github.com/weixin/posthtml-px2rem
[px2rem-badge]: https://img.shields.io/npm/v/posthtml-px2rem.svg
[px2rem-npm]: https://npmjs.com/package/posthtml-px2rem

[classes]: https://github.com/rajdee/posthtml-classes
[classes-badge]: https://img.shields.io/npm/v/posthtml-classes.svg
[classes-npm]: https://npmjs.com/package/posthtml-classes

[prefix]: https://github.com/stevenbenisek/posthtml-prefix-class
[prefix-badge]: https://img.shields.io/npm/v/posthtml-prefix-class.svg
[prefix-npm]: https://npmjs.com/package/posthtml-prefix-class

[modular]: https://github.com/admdh/posthtml-modular-css
[modular-badge]: https://img.shields.io/npm/v/posthtml-modular-css.svg
[modular-npm]: https://npmjs.com/package/posthtml-modular-css

[in]: https://github.com/posthtml/posthtml-inline-css
[in-badge]: https://img.shields.io/npm/v/posthtml-inline-css.svg
[in-npm]: https://npmjs.com/package/posthtml-inline-css

[style-expantion]: https://github.com/renyamizuno/posthtml-style-expantion
[style-expantion-badge]: https://img.shields.io/npm/v/posthtml-style-expansion.svg
[style-expantion-npm]: https://npmjs.com/package/posthtml-style-expansion

[style]: https://github.com/posthtml/posthtml-style-to-file
[style-badge]: https://img.shields.io/npm/v/posthtml-style-to-file.svg
[style-npm]: https://npmjs.com/package/posthtml-style-to-file

[hex]: https://github.com/posthtml/posthtml-color-shorthand-hex-to-six-digit
[hex-badge]: https://img.shields.io/npm/v/posthtml-color-shorthand-hex-to-six-digit.svg
[hex-npm]: https://npmjs.com/package/posthtml-color-shorthand-hex-to-six-digit

[minify]: https://github.com/simonlc/posthtml-minify-classnames
[minify-badge]: https://img.shields.io/npm/v/posthtml-minify-classnames.svg
[minify-npm]: https://npmjs.com/package/posthtml-minify-classnames

#### IMG & SVG

|Name|Status|Description|
|:---|:-----|:----------|
|[posthtml-img-autosize][img]|[![npm][img-badge]][img-npm]|Auto setting the width and height of \<img\>|
|[posthtml-to-svg-tags][svg]|[![npm][svg-badge]][svg-npm]|Convert html tags to svg equivalents|
|[posthtml-webp][webp]|[![npm][webp-badge]][webp-npm]|Add WebP support for images|
|[posthtml-favicons][favicons]|[![npm][favicons-badge]][favicons-npm]|Generate Favicons and add related tags|
|[posthtml-inline-svg][inline-svg]|[![npm][inline-svg-badge]][inline-svg-npm]|Inline svg icons in HTML|
|[posthtml-inline-favicon][inline-favicon]|[![npm][inline-favicon-badge]][inline-svg-npm]|Inline favicons in HTML|

[img]: https://github.com/posthtml/posthtml-img-autosize
[img-badge]: https://img.shields.io/npm/v/posthtml-img-autosize.svg
[img-npm]: https://npmjs.com/package/posthtml-img-autosize

[svg]: https://github.com/theprotein/posthtml-to-svg-tags
[svg-badge]: https://img.shields.io/npm/v/posthtml-to-svg-tags.svg
[svg-npm]: https://npmjs.com/package/posthtml-to-svg-tags

[webp]: https://github.com/posthtml/posthtml-webp
[webp-badge]: https://img.shields.io/npm/v/posthtml-webp.svg
[webp-npm]: https://npmjs.com/package/posthtml-webp

[favicons]: https://github.com/mohsen1/posthtml-favicons
[favicons-badge]: https://img.shields.io/npm/v/posthtml-favicons.svg
[favicons-npm]: https://www.npmjs.com/package/posthtml-favicons


[inline-svg]: https://github.com/andrey-hohlov/posthtml-inline-svg
[inline-svg-badge]: https://img.shields.io/npm/v/posthtml-inline-svg.svg
[inline-svg-npm]: https://www.npmjs.com/package/posthtml-inline-svg

[inline-favicon]: https://github.com/posthtml/posthtml-inline-favicon
[inline-favicon-badge]: https://img.shields.io/npm/v/posthtml-inline-favicon.svg
[inline-favicon-npm]: https://www.npmjs.com/package/posthtml-inline-favicon

#### Accessibility

|Name|Status|Description|
|:---|:-----|:----------|
|[posthtml-aria-tabs][aria]|[![npm][aria-badge]][aria-npm]|Write accessible tabs with minimal markup|
|[posthtml-alt-always][alt]|[![npm][alt-badge]][alt-npm]|Always add alt attribute for images that don't have it|
|[posthtml-schemas][schemas]|[![npm][schemas-badge]][schemas-npm]| Add microdata to your HTML|


[alt]: https://github.com/ismamz/posthtml-alt-always
[alt-badge]: https://img.shields.io/npm/v/posthtml-alt-always.svg
[alt-npm]: https://npmjs.com/package/posthtml-alt-always

[aria]: https://github.com/jonathantneal/posthtml-aria-tabs
[aria-badge]: https://img.shields.io/npm/v/posthtml-aria-tabs.svg
[aria-npm]: https://npmjs.com/package/posthtml-aria-tabs

[schemas]: https://github.com/jonathantneal/posthtml-schemas
[schemas-badge]: https://img.shields.io/npm/v/posthtml-schemas.svg
[schemas-npm]: https://npmjs.com/package/posthtml-schemas

#### Optimization

|Name|Status|Description|
|:---|:-----|:----------|
|[posthtml-shorten][shorten]|[![npm][shorten-badge]][shorten-npm]|Shorten URLs in HTML|
|[posthtml-uglify][uglify]|[![npm][uglify-badge]][uglify-npm]|Shorten CSS in HTML|
|[posthtml-minifier][minifier]|[![npm][minifier-badge]][minifier-npm]|Minify HTML|
|[posthtml-remove-attributes][remove]|[![npm][remove-badge]][remove-npm]|Remove attributes unconditionally or with content match|
|[posthtml-remove-tags][remove-tags]|[![npm][remove-tags-badge]][remove-tags-npm]|Remove tags with content match|
|[posthtml-remove-duplicates][remove-duplicates]|[![npm][remove-duplicates-badge]][remove-duplicates-npm]|Remove duplicate elements from your html|
|[posthtml-transformer][transform]|[![npm][transform-badge]][transform-npm]|Process HTML by directives in node attrs, such as inline scripts and styles, remove useless tags, concat scripts and styles etc.|
|[htmlnano][nano]|[![npm][nano-badge]][nano-npm]|HTML Minifier|
|[posthtml-link-noreferrer][noreferrer]|[![npm][noreferrer-badge]][noreferrer-npm]|Add `rel="noopener"` and `rel="noreferrer"` to all links that contain the attribute `target="_blank"` |
|[posthtml-lazyload][lazyload]|[![npm][lazyload-badge]][lazyload-npm]|Add native lazyload attribute|
|[posthtml-postcss-treeshaker][posthtml-postcss-treeshaker]|[![npm][posthtml-postcss-treeshaker-badge]][posthtml-postcss-treeshaker-npm]|Tree shake styles for classes and ids in `style` tag|
|[posthtml-external-link][posthtml-external-link]|[![npm][posthtml-external-link-badge]][posthtml-external-link-npm]|Add `rel="external noopenner nofollow"` and `target="_blank"` to all external links|

[remove]: https://github.com/princed/posthtml-remove-attributes
[remove-badge]: https://img.shields.io/npm/v/posthtml-remove-attributes.svg
[remove-npm]: https://npmjs.com/package/posthtml-remove-attributes

[remove-tags]: https://github.com/posthtml/posthtml-remove-tags
[remove-tags-badge]: https://img.shields.io/npm/v/posthtml-remove-tags.svg
[remove-tags-npm]: https://npmjs.com/package/posthtml-remove-tags

[remove-duplicates]: https://github.com/canvaskisa/posthtml-remove-duplicates
[remove-duplicates-badge]: https://img.shields.io/npm/v/posthtml-remove-duplicates.svg
[remove-duplicates-npm]: https://npmjs.com/package/posthtml-remove-duplicates

[minifier]: https://github.com/Rebelmail/posthtml-minifier
[minifier-badge]: https://img.shields.io/npm/v/posthtml-minifier.svg
[minifier-npm]: https://npmjs.com/package/posthtml-minifier

[shorten]: https://github.com/Rebelmail/posthtml-shorten
[shorten-badge]: https://img.shields.io/npm/v/posthtml-shorten.svg
[shorten-npm]: https://npmjs.com/package/posthtml-shorten

[uglify]: https://github.com/Rebelmail/posthtml-uglify
[uglify-badge]: https://img.shields.io/npm/v/posthtml-uglify.svg
[uglify-npm]: https://npmjs.com/package/posthtml-uglify

[nano]: https://github.com/maltsev/htmlnano
[nano-badge]: https://img.shields.io/npm/v/htmlnano.svg
[nano-npm]: https://npmjs.com/package/htmlnano

[transform]: https://github.com/flashlizi/posthtml-transformer
[transform-badge]: https://img.shields.io/npm/v/posthtml-transformer.svg
[transform-npm]: https://npmjs.com/package/posthtml-transformer

[noreferrer]: https://github.com/webistomin/posthtml-link-noreferrer
[noreferrer-badge]: https://img.shields.io/npm/v/posthtml-link-noreferrer.svg
[noreferrer-npm]: https://www.npmjs.com/package/posthtml-link-noreferrer

[lazyload]: https://github.com/webistomin/posthtml-lazyload
[lazyload-badge]: https://img.shields.io/npm/v/posthtml-link-noreferrer.svg
[lazyload-npm]: https://www.npmjs.com/package/posthtml-lazyload

[posthtml-postcss-treeshaker]: https://github.com/anikethsaha/posthtml-postcss-treeshaker
[posthtml-postcss-treeshaker-badge]: https://img.shields.io/npm/v/posthtml-postcss-treeshaker.svg
[posthtml-postcss-treeshaker-npm]: https://img.shields.io/npm/v/posthtml-postcss-treeshaker.svg

[posthtml-external-link]: https://github.com/posthtml/posthtml-external-link
[posthtml-external-link-badge]: https://img.shields.io/npm/v/posthtml-external-link.svg
[posthtml-external-link-npm]: https://www.npmjs.com/package/posthtml-external-link

#### Workflow

|Name|Status|Description|
|:---|:-----|:----------|
|[posthtml-load-plugins][plugins]|[![npm][plugins-badge]][plugins-npm]|Autoload Plugins
|[posthtml-load-options][options]|[![npm][options-badge]][options-npm]|Autoload Options (Parser && Render)|
|[posthtml-load-config][config]|[![npm][config-badge]][config-npm]|Autoload Config (Plugins && Options)|
|[posthtml-w3c][w3c]|[![npm][w3c-badge]][w3c-npm]|Validate HTML with W3C Validation|
|[posthtml-hint][hint]|[![npm][hint-badge]][hint-npm]|Lint HTML with HTML Hint|
|[posthtml-tidy][tidy]|[![npm][tidy-badge]][tidy-npm]|Sanitize HTML with HTML Tidy|

[options]: https://github.com/posthtml/posthtml-load-options
[options-badge]: https://img.shields.io/npm/v/posthtml-load-options.svg
[options-npm]: https://npmjs.com/package/posthtml-load-options

[plugins]: https://github.com/posthtml/posthtml-load-plugins
[plugins-badge]: https://img.shields.io/npm/v/posthtml-load-plugins.svg
[plugins-npm]: https://npmjs.com/package/posthtml-load-plugins

[config]: https://github.com/posthtml/posthtml-load-config
[config-badge]: https://img.shields.io/npm/v/posthtml-load-config.svg
[config-npm]: https://npmjs.com/package/posthtml-load-config

[tidy]: https://github.com/michael-ciniawsky/posthtml-tidy
[tidy-badge]: https://img.shields.io/npm/v/posthtml-tidy.svg
[tidy-npm]: https://npmjs.com/package/posthtml-tidy

[hint]: https://github.com/posthtml/posthtml-hint
[hint-badge]: https://img.shields.io/npm/v/posthtml-hint.svg
[hint-npm]: https://npmjs.com/package/posthtml-hint

[w3c]: https://github.com/posthtml/posthtml-w3c
[w3c-badge]: https://img.shields.io/npm/v/posthtml-w3c.svg
[w3c-npm]: https://npmjs.com/package/posthtml-w3c

## Middleware

|Name|Status|Description|
|:---|:-----|:----------|
|[koa-posthtml][koa]|[![npm][koa-badge]][koa-npm]|Koa Middleware|
|[hapi-posthtml][hapi]|[![npm][hapi-badge]][hapi-npm]|Hapi Plugin|
|[express-posthtml][express]|[![npm][express-badge]][express-npm]|Express Middleware|
|[electron-posthtml][electron]|[![npm][electron-badge]][electron-npm]|Electron Plugin|
|[metalsmith-posthtml][metalsmith]|[![npm][metalsmith-badge]][metalsmith-npm]|Metalsmith Plugin|


[koa]: https://github.com/posthtml/koa-posthtml
[koa-badge]: https://img.shields.io/npm/v/koa-posthtml.svg
[koa-npm]: https://npmjs.com/package/koa-posthtml

[hapi]: https://github.com/posthtml/hapi-posthtml
[hapi-badge]: https://img.shields.io/npm/v/hapi-posthtml.svg
[hapi-npm]: https://npmjs.com/package/hapi-posthtml

[express]: https://github.com/posthtml/express-posthtml
[express-badge]: https://img.shields.io/npm/v/express-posthtml.svg
[express-npm]: https://npmjs.com/package/express-posthtml

[electron]: https://github.com/posthtml/electron-posthtml
[electron-badge]: https://img.shields.io/npm/v/electron-posthtml.svg
[electron-npm]: https://npmjs.com/package/electron-posthtml

[metalsmith]: https://github.com/posthtml/metalsmith-posthtml
[metalsmith-badge]: https://img.shields.io/npm/v/metalsmith-posthtml.svg
[metalsmith-npm]: https://npmjs.com/package/metalsmith-posthtml

## Maintainers

<table>
  <tbody>
   <tr>
    <td align="center">
      <img width="150 height="150"
      src="https://avatars0.githubusercontent.com/u/2789192?s=460&v=4">
      <br />
      <a href="https://github.com/scrum">Ivan Demidov</a>
    </td>
    <td align="center">
      <img width="150 height="150"
      src="https://avatars.githubusercontent.com/u/1510217?v=3&s=150">
      <br />
      <a href="https://github.com/voischev">Ivan Voischev</a>
    </td>
   </tr>
  <tbody>
</table>

## Contributing

See [PostHTML Guidelines](plugins/guide.md) and [CONTRIBUTING](CONTRIBUTING.md).

## Contributors

<a href="https://github.com/posthtml/posthtml/graphs/contributors"><img src="https://opencollective.com/posthtml/contributors.svg?width=890&button=false" /></a>

## Backers

Thank you to all our backers! 🙏 [[Become a backer](https://opencollective.com/posthtml#backer)]

<a href="https://opencollective.com/posthtml#backers" target="_blank"><img src="https://opencollective.com/posthtml/backers.svg?width=885&button=false"></a>

## LICENSE

[MIT](LICENSE)


[npm]: https://img.shields.io/npm/v/posthtml.svg
[npm-url]: https://npmjs.com/package/posthtml

[deps]: https://david-dm.org/posthtml/posthtml.svg
[deps-url]: https://david-dm.org/posthtml/posthtml

[build]: https://github.com/posthtml/posthtml/workflows/Actions%20Status/badge.svg?style=flat-square
[build-url]: https://github.com/posthtml/posthtml/actions?query=workflow%3A%22CI+tests%22

[cover]: https://coveralls.io/repos/posthtml/posthtml/badge.svg?branch=master
[cover-url]: https://coveralls.io/r/posthtml/posthtml?branch=master

[code-style]: https://img.shields.io/badge/code%20style-standard-yellow.svg
[code-style-url]: http://standardjs.com/

[twitter]: https://badgen.net/twitter/follow/posthtml
[twitter-url]: https://twitter.com/PostHTML

[chat]: https://badges.gitter.im/posthtml/PostHTML.svg
[chat-url]: https://gitter.im/posthtml/posthtml?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge"
[docs-url]: https://github.com/posthtml/posthtml/tree/master/docs
