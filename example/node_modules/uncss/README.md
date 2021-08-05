# UnCSS

[![NPM version](https://img.shields.io/npm/v/uncss.svg)](https://www.npmjs.com/package/uncss)
[![Linux Build Status](https://img.shields.io/travis/uncss/uncss/master.svg?label=Linux%20build)](https://travis-ci.org/uncss/uncss)
[![Windows Build status](https://img.shields.io/appveyor/ci/uncss/uncss/master.svg?label=Windows%20build)](https://ci.appveyor.com/project/uncss/uncss/branch/master)
[![Coverage Status](https://img.shields.io/coveralls/uncss/uncss.svg)](https://coveralls.io/r/uncss/uncss?branch=master)
[![dependencies Status](https://img.shields.io/david/uncss/uncss.svg)](https://david-dm.org/uncss/uncss)
[![devDependencies Status](https://img.shields.io/david/dev/uncss/uncss.svg)](https://david-dm.org/uncss/uncss?type=dev)

UnCSS is a tool that removes unused CSS from your stylesheets.
It works across multiple files and supports Javascript-injected CSS.

## How

The process by which UnCSS removes the unused rules is as follows:

1. The HTML files are loaded by [jsdom](https://github.com/tmpvar/jsdom) and JavaScript is executed.
2. All the stylesheets are parsed by [PostCSS](https://github.com/postcss/postcss).
3. `document.querySelector` filters out selectors that are not found in the HTML files.
4. The remaining rules are converted back to CSS.

**Please note:**

- UnCSS cannot be run on non-HTML pages, such as templates or PHP files. If you need to run UnCSS against your templates, you should probably generate example HTML pages from your templates, and run uncss on those generated files; or run a live local dev server, and point uncss at that.
- UnCSS only runs the Javascript that is run on page load. It does not (and cannot) handle Javascript that runs on user interactions like button clicks. You must use the `ignore` option to preserve classes that are added by Javascript on user interaction.

## Installation

```shell
npm install -g uncss
```

## Usage

### Online Server

- [https://uncss-online.com/](https://uncss-online.com/) - Unofficial server, very convenient for testing or one-off usage!

### Within Node.js

```js
var uncss = require('uncss');

var files   = ['my', 'array', 'of', 'HTML', 'files', 'or', 'http://urls.com'],
    options = {
        banner       : false,
        csspath      : '../public/css/',
        htmlroot     : 'public',
        ignore       : ['#added_at_runtime', /test\-[0-9]+/],
        ignoreSheets : [/fonts.googleapis/],
        inject       : function(window) { window.document.querySelector('html').classList.add('no-csscalc', 'csscalc'); },
        jsdom        : {
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3 like Mac OS X)',
        },
        media        : ['(min-width: 700px) handheld and (orientation: landscape)'],
        raw          : 'h1 { color: green }',
        report       : false,
        strictSSL    : true,
        stylesheets  : ['lib/bootstrap/dist/css/bootstrap.css', 'src/public/css/main.css'],
        timeout      : 1000,
        uncssrc      : '.uncssrc',
        userAgent    : 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3 like Mac OS X)',
    };

uncss(files, options, function (error, output) {
    console.log(output);
});

/* Look Ma, no options! */
uncss(files, function (error, output) {
    console.log(output);
});

/* Specifying raw HTML */
var rawHtml = '...';

uncss(rawHtml, options, function (error, output) {
    console.log(output);
});
```

### At build-time

UnCSS can also be used in conjunction with other JavaScript build systems, such as [Grunt](https://github.com/gruntjs/grunt), [Broccoli](https://github.com/broccolijs/broccoli#readme) or [Gulp](https://github.com/gulpjs/gulp)!

- [grunt-uncss](https://github.com/uncss/grunt-uncss) – Thanks to [@addyosmani](https://github.com/addyosmani)
- [gulp-uncss](https://github.com/ben-eb/gulp-uncss) – Thanks to [@ben-eb](https://github.com/ben-eb)
- [broccoli-uncss](https://github.com/sindresorhus/broccoli-uncss) - Thanks to [@sindresorhus](https://github.com/sindresorhus)

### From the command line

```txt
Usage: uncss [options] <file or URL, ...>
    e.g. uncss https://getbootstrap.com/docs/3.3/examples/jumbotron/ > stylesheet.css

Options:

  -h, --help                            output usage information
  -V, --version                         output the version number
  -i, --ignore <selector, ...>          Do not remove given selectors
  -m, --media <media_query, ...>        Process additional media queries
  -C, --csspath <path>                  Relative path where the CSS files are located
  -s, --stylesheets <file, ...>         Specify additional stylesheets to process
  -S, --ignoreSheets <selector, ...>    Do not include specified stylesheets
  -r, --raw <string>                    Pass in a raw string of CSS
  -t, --timeout <milliseconds>          Wait for JS evaluation
  -H, --htmlroot <folder>               Absolute paths' root location
  -u, --uncssrc <file>                  Load these options from <file>
  -n, --noBanner                        Disable banner
  -a, --userAgent <string>              Use a custom user agent string
  -I, --inject <file>                   Path to javascript file to be executed before uncss runs
  -o, --output <file>                   Path to write resulting CSS to
```

**Note that you can pass both local file paths (which are processed by [glob](https://github.com/isaacs/node-glob)) and URLs to the program.**

- **banner** (boolean, default: `true`): Whether a banner should be prepended before each file block in the processed CSS.

- **csspath** (string): Path where the CSS files are related to the HTML files. By default, UnCSS uses the path specified in the `<link rel="stylesheet" href="path/to/file.css"/>`.

- **htmlroot** (string): Where the project root is. Useful for example if you have HTML that references _local_ files with root-relative URLs, i.e. `href="/css/style.css"`.

- **ignore** (string[]): provide a list of selectors that should not be removed by UnCSS. For example, styles added by user interaction with the page (hover, click), since those are not detectable by UnCSS yet. Both literal names and regex patterns are recognized. Otherwise, you can add a comment before specific selectors:

  ```css
  /* uncss:ignore */
  .selector1 {
      /* this rule will be ignored */
  }

  .selector2 {
      /* this will NOT be ignored */
  }

  /* uncss:ignore start */

  /* all rules in here will be ignored */

  /* uncss:ignore end */
  ```

- **ignoreSheets** (string[] | RegExp[]): Do not process these stylesheets, e.g. Google fonts. Accepts strings or regex patterns.

- **inject** (string / function(window)): Path to a local javascript file which is executed before uncss runs. A function can also be passed directly in.

    Example inject.js file

    ```js
    'use strict';

    module.exports = function(window) {
        window.document.querySelector('html').classList.add('no-csscalc', 'csscalc');
    };
    ```

    Example of passing inject as a function

    ```js
    {
      inject: function(window){
        window.document.querySelector('html').classList.add('no-csscalc', 'csscalc');
      }
    }
    ```

- **jsdom** (object) (Supported only by API): Supply the options used to create the JSDOM pages ([https://github.com/jsdom/jsdom](https://github.com/jsdom/jsdom)). At the moment, `config.resources` is not yet supported.

- **media** (string[]): By default UnCSS processes only stylesheets with media query `_all_`, `_screen_`, and those without one. Specify here which others to include.

- **raw** (string): Give the task a raw string of CSS in addition to the existing stylesheet options; useful in scripting when your CSS hasn't yet been written to disk.

- **report** (boolean, default: `true`): Return the report object in callback.

- **strictSSL** (boolean, default: `true`): Disable SSL verification when retrieving html source

- **stylesheets** (string[]): Use these stylesheets instead of those extracted from the HTML files. Prepend paths with the `file://` protocol to force use of local stylesheets, otherwise paths will be resolved as a browser would for an anchor tag `href` on the HTML page.

- **timeout** (number): Specify how long to wait for the JS to be loaded.

- **uncssrc** (string): Load all options from a JSON file. Regular expressions for the `ignore` and `ignoreSheets` options should be wrapped in quotation marks.

  Example uncssrc file:

  ```json
  {
      "ignore": [
          ".unused",
          "/^#js/"
      ],
      "stylesheets": [
          "css/override.css"
      ]
  }
  ```

- **userAgent** (String, default: `'uncss'`): The user agent string that jsdom should send when requesting pages. May be useful when loading markup from services which use user agent based device detection to serve custom markup to mobile devices. Defaults to `uncss`.

### As a PostCSS Plugin

UnCSS can be used as a [PostCSS](https://github.com/postcss/postcss) Plugin.

```js
postcss([ require('uncss').postcssPlugin ]);
```

See [PostCSS docs](https://github.com/postcss/postcss) for examples for your environment.

**Note:** Depending on your environment, you might not be able to use uncss as a PostCSS plugin since the plugin is not directly exported. In such cases, use the wrapper library [postcss-uncss](https://github.com/RyanZim/postcss-uncss).

#### Options

- **html** (string[]): provide a list of html files to parse for selectors and elements. Usage of [globs](https://github.com/isaacs/node-glob) is allowed.

- **ignore** (string[] | RegExp[]): provide a list of selectors that should not be removed by UnCSS. For example, styles added by user interaction with the page (hover, click), since those are not detectable by UnCSS yet. Both literal names and regex patterns are recognized. Otherwise, you can add a comment before specific selectors in your CSS:

  ```css
  /* uncss:ignore */
  .selector1 {
      /* this rule will be ignored */
  }

  .selector2 {
      /* this will NOT be ignored */
  }
  ```

##### Example Configuration

```js
{
  html: ['index.html', 'about.html', 'team/*.html'],
  ignore: ['.fade']
}
```

## License

Copyright (c) 2019 Giacomo Martino. See the [LICENSE](/LICENSE.md) file for license rights and limitations (MIT).
