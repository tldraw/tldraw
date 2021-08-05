# htmlnano
[![npm version](https://badge.fury.io/js/htmlnano.svg)](http://badge.fury.io/js/htmlnano)
[![Build Status](https://travis-ci.org/posthtml/htmlnano.svg?branch=master)](https://travis-ci.org/posthtml/htmlnano)

Modular HTML minifier, built on top of the [PostHTML](https://github.com/posthtml/posthtml). Inspired by [cssnano](http://cssnano.co/).

> The author of htmlnano is available for hire as a full stack web developer:  https://kirillmaltsev.net/services


## [Benchmark](https://github.com/maltsev/html-minifiers-benchmark/blob/master/README.md)
[html-minifier@4.0.0]: https://www.npmjs.com/package/html-minifier
[htmlnano@0.2.8]: https://www.npmjs.com/package/htmlnano

| Website | Source (KB) | [html-minifier@4.0.0] | [htmlnano@0.2.8] |
|---------|------------:|----------------:|-----------:|
| [stackoverflow.blog](https://stackoverflow.blog/) | 78 | 72 | 66 |
| [github.com](https://github.com/) | 215 | 187 | 177 |
| [en.wikipedia.org](https://en.wikipedia.org/wiki/Main_Page) | 78 | 73 | 72 |
| [npmjs.com](https://www.npmjs.com/features) | 29 | 25 | 25 |
| **Avg. minify rate** | 0% | **10%** | **13%** |


## Usage
### Gulp
```bash
npm install --save-dev gulp-htmlnano
```

```js
const gulp = require('gulp');
const htmlnano = require('gulp-htmlnano');
const options = {
    removeComments: false
};

gulp.task('default', function() {
    return gulp
        .src('./index.html')
        .pipe(htmlnano(options))
        .pipe(gulp.dest('./build'));
});
```


### Javascript
```js
const htmlnano = require('htmlnano');
const options = {
    removeEmptyAttributes: false, // Disable the module "removeEmptyAttributes"
    collapseWhitespace: 'conservative' // Pass options to the module "collapseWhitespace"
};
// posthtml, posthtml-render, and posthtml-parse options
const postHtmlOptions = {
    sync: true, // https://github.com/posthtml/posthtml#usage
    lowerCaseTags: true, // https://github.com/posthtml/posthtml-parser#options
    quoteAllAttributes: false, // https://github.com/posthtml/posthtml-render#options
};

htmlnano
    // "preset" arg might be skipped (see "Presets" section below for more info)
    // "postHtmlOptions" arg might be skipped
    .process(html, options, preset, postHtmlOptions)
    .then(function (result) {
        // result.html is minified
    })
    .catch(function (err) {
        console.error(err);
    });
```


### PostHTML
Just add `htmlnano` as a final plugin:
```js
const posthtml = require('posthtml');
const options = {
    removeComments: false, // Disable the module "removeComments"
    collapseWhitespace: 'conservative' // Pass options to the module "collapseWhitespace"
};
const posthtmlPlugins = [
    /* other PostHTML plugins */

    require('htmlnano')(options)
];

const postHtmlOptions = {
    // See PostHTML docs
};

posthtml(posthtmlPlugins)
    .process(html, posthtmlOptions)
    .then(function (result) {
        // result.html is minified
    })
    .catch(function (err) {
        console.error(err);
    });
```



## Presets
A preset is just an object with modules config.

Currently the following presets are available:
- [safe](https://github.com/posthtml/htmlnano/blob/master/lib/presets/safe.es6) — a default preset for minifying a regular HTML in a safe way (without breaking anything)
- [ampSafe](https://github.com/posthtml/htmlnano/blob/master/lib/presets/ampSafe.es6) - same as `safe` preset but for [AMP pages](https://www.ampproject.org/)
- [max](https://github.com/posthtml/htmlnano/blob/master/lib/presets/max.es6) - maximal minification (might break some pages)


You can use them the following way:
```js
const htmlnano = require('htmlnano');
const ampSafePreset = require('htmlnano').presets.ampSafe;
const options = {
    // Your options
};

htmlnano
    .process(html, options, ampSafePreset)
    .then(function (result) {
        // result.html is minified
    })
    .catch(function (err) {
        console.error(err);
    });
```

If you skip `preset` argument [`safe`](https://github.com/posthtml/htmlnano/blob/master/lib/presets/safe.es6) preset would be used by default.


If you'd like to define your very own config without any presets pass an empty object as a preset:
```js
const htmlnano = require('htmlnano');
const options = {
    // Your options
};

htmlnano
    .process(html, options, {})
    .then(function (result) {
        // result.html is minified
    })
    .catch(function (err) {
        console.error(err);
    });
```


You might create also your own presets:
```js
const htmlnano = require('htmlnano');
// Preset for minifying email templates
const emailPreset = {
    mergeStyles: true,
    minifyCss: {
        safe: true
    },
};

const options = {
    // Some specific options
};

htmlnano
    .process(html, options, emailPreset)
    .then(function (result) {
        // result.html is minified
    })
    .catch(function (err) {
        console.error(err);
    });
```

Feel free [to submit a PR](https://github.com/posthtml/htmlnano/issues/new) with your preset if it might be useful for other developers as well.



## Modules
By default the modules should only perform safe transforms, see the module documentation below for details.
You can disable modules by passing `false` as option, and enable them by passing `true`.


### collapseAttributeWhitespace
Collapse redundant white spaces in list-like attributes (`class`, `rel`, `ping`).

##### Example
Source:
```html
<div class=" content  page  "></div>
```

Minified:
```html
<div class="content page"></div>
```



### collapseWhitespace
Collapses redundant white spaces (including new lines). It doesn’t affect white spaces in the elements `<style>`, `<textarea>`, `<script>` and `<pre>`.

##### Options
- `conservative` — collapses all redundant white spaces to 1 space (default)
- `aggressive` — collapses all whitespaces that are redundant and safe to remove
- `all` — collapses all redundant white spaces

##### Side effects

*all*
`<i>hello</i> <i>world</i>` or `<i>hello</i><br><i>world</i>` after minification will be rendered as `helloworld`.
To prevent that use either the default `conservative` option, or the `aggressive` option.

##### Example
Source:
```html
<div>
    hello  world!
    <a href="#">answer</a>
    <style>div  { color: red; }  </style>
    <main></main>
</div>
```

Minified (with `all`):
```html
<div>hello world!<a href="#">answer</a><style>div  { color: red; }  </style><main></main></div>
```

Minified (with `aggressive`):
```html
<div> hello world! <a href="#">answer</a> <style>div  { color: red; }  </style><main></main></div>
```

Minified (with `conservative`):
```html
<div> hello world! <a href="#">answer</a> <style>div  { color: red; }  </style> <main></main> </div>
```


### deduplicateAttributeValues
Remove duplicate values from list-like attributes (`class`, `rel`, `ping`).

##### Example
Source:
```html
<div class="sidebar left sidebar"></div>
```

Minified:
```html
<div class="sidebar left"></div>
```


### removeComments
##### Options
- `safe` – removes all HTML comments except the conditional comments and  [`<!--noindex--><!--/noindex-->`](https://yandex.com/support/webmaster/controlling-robot/html.xml) (default)
- `all` — removes all HTML comments

##### Example
Source:
```html
<div><!-- test --></div>
```

Minified:
```html
<div></div>
```


### removeEmptyAttributes
Removes empty [safe-to-remove](https://github.com/posthtml/htmlnano/blob/master/lib/modules/removeEmptyAttributes.es6) attributes.

##### Side effects
This module could break your styles or JS if you use selectors with attributes:
```CSS
img[style=""] {
    margin: 10px;
}
```

##### Example
Source:
```html
<img src="foo.jpg" alt="" style="">
```

Minified:
```html
<img src="foo.jpg" alt="">
```

### removeAttributeQuotes
Remove quotes around attributes when possible, see [HTML Standard - 12.1.2.3 Attributes - Unquoted attribute value syntax](https://html.spec.whatwg.org/multipage/syntax.html#attributes-2).

##### Example
Source:
```html
<div class="foo" title="hello world"></div>
```

Minified:
```html
<div class=foo title="hello world"></div>
```

##### Notice
The feature is implemented by [posthtml-render's `quoteAllAttributes`](https://github.com/posthtml/posthtml-render#options), which is one of the PostHTML's option. So `removeAttributeQuotes` could be overriden by other PostHTML's plugins and PostHTML's configuration.

For example:

```js
posthtml([
    htmlnano({
        removeAttributeQuotes: true
    })
]).process(html, {
    quoteAllAttributes: true
})
```

`removeAttributeQuotes` will not work because PostHTML's `quoteAllAttributes` takes the priority.

### removeUnusedCss

Removes unused CSS inside `<style>` tags with either [uncss](https://github.com/uncss/uncss)
or [PurgeCSS](https://github.com/FullHuman/purgecss).

#### With uncss

##### Options
See [the documentation of uncss](https://github.com/uncss/uncss) for all supported options.

uncss options can be passed directly to the `removeUnusedCss` module:
```js
htmlnano.process(html, {
    removeUnusedCss: {
        ignore: ['.do-not-remove']
    }
});
```

The following uncss options are ignored if passed to the module:

-   `stylesheets`
-   `ignoreSheets`
-   `raw`

#### With PurgeCSS

Use PurgeCSS instead of uncss by adding `tool: 'purgeCSS'` to the options.

##### Options

See [the documentation of PurgeCSS](https://www.purgecss.com) for all supported options.

PurgeCSS options can be passed directly to the `removeUnusedCss` module:
```js
htmlnano.process(html, {
    removeUnusedCss: {
        tool: 'purgeCSS',
        safelist: ['.do-not-remove']
    }
});
```

The following PurgeCSS options are ignored if passed to the module:

-   `content`
-   `css`
-   `extractors`

##### Example
Source:
```html
<div class="b">
    <style>
        .a {
            margin: 10px 10px 10px 10px;
        }
        .b {
            color: #ff0000;
        }
    </style>
</div>
```

Optimized:
```html
<div class="b">
    <style>
        .b {
            color: #ff0000;
        }
    </style>
</div>
```


### minifyCss
Minifies CSS with [cssnano](http://cssnano.co/) inside `<style>` tags and `style` attributes.

##### Options
See [the documentation of cssnano](http://cssnano.co/optimisations/) for all supported optimizations.
By default CSS is minified with preset `default`, which shouldn't have any side-effects.

To use another preset or disabled some optimizations pass options to `minifyCss` module:
```js
htmlnano.process(html, {
    minifyCss: {
        preset: ['default', {
            discardComments: {
                removeAll: true,
            },
        }]
    }
});
```

##### Example
Source:
```html
<div>
    <style>
        h1 {
            margin: 10px 10px 10px 10px;
            color: #ff0000;
        }
    </style>
</div>
```

Minified:
```html
<div>
    <style>h1{margin:10px;color:red}</style>
</div>
```


### minifyJs
Minifies JS using [Terser](https://github.com/fabiosantoscode/terser) inside `<script>` tags.

##### Options
See [the documentation of Terser](https://github.com/fabiosantoscode/terser#api-reference) for all supported options.
Terser options can be passed directly to the `minifyJs` module:
```js
htmlnano.process(html, {
    minifyJs: {
        output: { quote_style: 1 },
    },
});
```



##### Example
Source:
```html
<div>
    <script>
        /* comment */
        const foo = function () {

        };
    </script>
</div>
```

Minified:
```html
<div>
    <script>const foo=function(){};</script>
</div>
```


### minifyJson
Minifies JSON inside `<script type="application/json"></script>`.

##### Example
Source:
```html
<script type="application/json">
{
    "user": "me"
}
</script>
```

Minified:
```html
<script type="application/json">{"user":"me"}</script>
```


### minifySvg
Minifies SVG inside `<svg>` tags using [SVGO](https://github.com/svg/svgo/).

##### Options
See [the documentation of SVGO](https://github.com/svg/svgo/blob/master/README.md) for all supported options.
SVGO options can be passed directly to the `minifySvg` module:
```js
htmlnano.process(html, {
    minifySvg: {
        plugins: extendDefaultPlugins([
            {
                name: 'builtinPluginName',
                params: {
                    optionName: 'optionValue'
                }
            }
        ])
    }
});
```

##### Example
Source:
```html
<svg version="1.1" baseProfile="full" width="300" height="200" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="red" />

    <circle cx="150" cy="100" r="80" fill="green" />

    <text x="150" y="125" font-size="60" text-anchor="middle" fill="white">SVG</text>
</svg>`
```

Minified:
```html
<svg baseProfile="full" width="300" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="red"/><circle cx="150" cy="100" r="80" fill="green"/><text x="150" y="125" font-size="60" text-anchor="middle" fill="#fff">SVG</text></svg>
```

### minifyConditionalComments

Minify content inside conditional comments.

##### Example

Source:

```html
<!--[if lte IE 7]>
<style type="text/css">
.title {
  color: red;
}
</style>
<![endif]-->
```

Minified:

```html
<!--[if lte IE 7]><style>.title{color:red}</style><![endif]-->
```

### removeRedundantAttributes
Removes redundant attributes from tags if they contain default values:
- `method="get"` from `<form>`
- `type="text"` from `<input>`
- `type="submit"` from `<button>`
- `language="javascript"` and `type="text/javascript"` from `<script>`
- `charset` from `<script>` if it's an external script
- `media="all"` from `<style>` and `<link>`
- `type="text/css"` from `<link rel="stylesheet">`

##### Options
This module is disabled by default, change option to true to enable this module.

##### Side effects
This module could break your styles or JS if you use selectors with attributes:
```CSS
form[method="get"] {
    color: red;
}
```

##### Example
Source:
```html
<form method="get">
    <input type="text">
</form>
```

Minified:
```html
<form>
    <input>
</form>
```


### collapseBooleanAttributes
Collapses boolean attributes (like `disabled`) to the minimized form.

##### Options
If your document uses [AMP](https://www.ampproject.org/), set the `amphtml` flag
to collapse additonal, AMP-specific boolean attributes:
```Json
"collapseBooleanAttributes": {
    "amphtml": true
}
```

##### Side effects
This module could break your styles or JS if you use selectors with attributes:
```CSS
button[disabled="disabled"] {
    color: red;
}
```

##### Example
Source:
```html
<button disabled="disabled">click</button>
<script defer=""></script>
```

Minified:
```html
<button disabled>click</button>
<script defer></script>
```


### mergeStyles
Merges multiple `<style>` with the same `media` and `type` into one tag.
`<style scoped>...</style>` are skipped.

##### Example
Source:
```html
<style>h1 { color: red }</style>
<style media="print">div { color: blue }</style>

<style type="text/css" media="print">a {}</style>
<style>div { font-size: 20px }</style>
```

Minified:
```html
<style>h1 { color: red } div { font-size: 20px }</style>
<style media="print">div { color: blue } a {}</style>
```


### mergeScripts
Merge multiple `<script>` with the same attributes (`id, class, type, async, defer`) into one (last) tag.

##### Side effects
It could break your code if the tags with different attributes share the same variable scope.
See the example below.

##### Example
Source:
```html
<script>const foo = 'A:1';</script>
<script class="test">foo = 'B:1';</script>
<script type="text/javascript">foo = 'A:2';</script>
<script defer>foo = 'C:1';</script>
<script>foo = 'A:3';</script>
<script defer="defer">foo = 'C:2';</script>
<script class="test" type="text/javascript">foo = 'B:2';</script>
```

Minified:
```html
<script>const foo = 'A:1'; foo = 'A:2'; foo = 'A:3';</script>
<script defer="defer">foo = 'C:1'; foo = 'C:2';</script>
<script class="test" type="text/javascript">foo = 'B:1'; foo = 'B:2';</script>
```


### custom
It's also possible to pass custom modules in the minifier.
As a function:
```js
const options = {
    custom: function (tree, options) {
        // Some minification
        return tree;
    }
};
```

Or as a list of functions:
```js
const options = {
    custom: [
        function (tree, options) {
            // Some minification
            return tree;
        },

        function (tree, options) {
            // Some other minification
            return tree;
        }
    ]
};
```

`options` is an object with all options that were passed to the plugin.

### sortAttributesWithLists
Sort values in list-like attributes (`class`, `rel`, `ping`).

The module won't impact the plain-text size of the output. However it will improve the compression ratio of gzip/brotli used in HTTP compression.

##### Options

- `alphabetical`: Default option. Sort attribute values in alphabetical order.
- `frequency`: Sort attribute values by frequency.

##### Example

**alphabetical**

Source:
```html
<div class="foo baz bar">click</div>
```

Processed:
```html
<div class="bar baz foo">click</div>
```

**frequency**

Source:
```html
<div class="foo baz bar"></div><div class="bar foo"></div>
```

Processed:
```html
<div class="foo bar baz"></div><div class="foo bar"></div>
```

### sortAttributes
Sort attributes inside elements.

The module won't impact the plain-text size of the output. However it will improve the compression ratio of gzip/brotli used in HTTP compression.

##### Options

- `alphabetical`: Default option. Sort attributes in alphabetical order.
- `frequency`: Sort attributes by frequency.

##### Example

**alphabetical**

Source:
```html
<input type="text" class="form-control" name="testInput" autofocus="" autocomplete="off" id="testId">
```

Processed:
```html
<input autocomplete="off" autofocus="" class="form-control" id="testId" name="testInput" type="text">
```

**frequency**

Source:
```html
<input type="text" class="form-control" name="testInput" id="testId">
<a id="testId" href="#" class="testClass"></a>
<img width="20" src="../images/image.png" height="40" alt="image" class="cls" id="id2">
```

Processed:
```html
<input class="form-control" id="testId" type="text" name="testInput">
<a class="testClass" id="testId" href="#"></a>
<img class="cls" id="id2" width="20" src="../images/image.png" height="40" alt="image">
```

### minifyUrls
Convert absolute URL to relative URL using [relateurl](https://www.npmjs.com/package/relateurl).

##### Options

The base URL to resolve against. Support `String` & `URL`.

```js
htmlnano.process(html, {
    minifyUrls: 'https://example.com' // Valid configuration
});
```

```js
htmlnano.process(html, {
    minifyUrls: new URL('https://example.com') // Valid configuration
});
```

```js
htmlnano.process(html, {
    minifyUrls: false // The module will be disabled
});
```

```js
htmlnano.process(html, {
    minifyUrls: true // Invalid configuration, the module will be disabled
});
```

##### Example

**Basic Usage**

Configuration:

```js
htmlnano.process(html, {
    minifyUrls: 'https://example.com'
});
```

Source:

```html
<a href="https://example.com/foo/bar/baz">bar</a>
```

Minified:

```html
<a href="foo/bar/baz">bar</a>
```

**With sub-directory**

Configuration:

```js
htmlnano.process(html, {
    minifyUrls: 'https://example.com/foo/baz/'
});
```

Source:

```html
<a href="https://example.com/foo/bar">bar</a>
```

Minified:

```html
<a href="../bar">bar</a>
```

## removeOptionalTags
Remove certain tags that can be omitted, see [HTML Standard - 13.1.2.4 Optional tags](https://html.spec.whatwg.org/multipage/syntax.html#optional-tags).

##### Example

Source:

```html
<html><head><title>Title</title></head><body><p>Hi</p></body></html>
```

Minified:

```html
<title>Title</title><p>Hi</p>
```
##### Notice
Due to [the limitation of PostHTML](https://github.com/posthtml/htmlnano/issues/99), htmlnano can't remove only the start tag or the end tag of an element. Currently, htmlnano only supports removing the following optional tags, as htmlnano can remove their start tag and end tag at the same time:

- `html`
- `head`
- `body`
- `colgroup`
- `tbody`

## Contribute
Since the minifier is modular, it's very easy to add new modules:

1. Create a ES6-file inside `lib/modules/` with a function that does some minification. For example you can check [`lib/modules/example.es6`](https://github.com/posthtml/htmlnano/blob/master/lib/modules/example.es6).

2. Add the module's name into one of those [presets](https://github.com/posthtml/htmlnano/tree/master/lib/presets). You can choose either `ampSafe`, `max`, or `safe`.

3. Create a JS-file inside `test/modules/` with some unit-tests.

4. Describe your module in the section "[Modules](https://github.com/posthtml/htmlnano/blob/master/README.md#modules)".

5. Send me a pull request.

Other types of contribution (bug fixes, documentation improves, etc) are also welcome!
Would like to contribute, but don't have any ideas what to do? Check out [our issues](https://github.com/posthtml/htmlnano/labels/help%20wanted).
