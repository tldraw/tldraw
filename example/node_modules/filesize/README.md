# filesize.js

[![build status](https://secure.travis-ci.org/avoidwork/filesize.js.svg)](http://travis-ci.org/avoidwork/filesize.js)  [![downloads](https://img.shields.io/npm/dt/filesize.svg)](https://www.npmjs.com/package/filesize) [![CDNJS version](https://img.shields.io/cdnjs/v/filesize.svg)](https://cdnjs.com/libraries/filesize)

filesize.js provides a simple way to get a human readable file size string from a number (float or integer) or string.

## Optional settings

`filesize()` accepts an optional descriptor Object as a second argument, so you can customize the output.

### base
_*(number)*_ Number base, default is `2`

### bits
_*(boolean)*_ Enables `bit` sizes, default is `false`

### exponent
_*(number)*_ Specifies the symbol via exponent, e.g. `2` is `MB` for base 2, default is `-1`

### fullform
_*(boolean)*_ Enables full form of unit of measure, default is `false`

### fullforms
_*(array)*_ Array of full form overrides, default is `[]`

### locale (overrides 'separator')
_*(string || boolean)*_ BCP 47 language tag to specify a locale, or `true` to use default locale, default is `""`

### localeOptions (overrides 'separator', requires string for 'locale' option)
_*(object)*_ Dictionary of options defined by ECMA-402 ([Number.prototype.toLocaleString](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toLocaleString)). Requires locale option to be explicitly passed as a string, otherwise is ignored.

### output
_*(string)*_ Output of function (`array`, `exponent`, `object`, or `string`), default is `string`

### pad
_*(boolean)*_ Decimal place end padding, default is `false`

### precision
_*(number)*_ Sets precision of numerical output, default is `0`

### round
_*(number)*_ Decimal place, default is `2`

### roundingMethod
_*(string)*_ Rounding method, can be `round`, `floor`, or `ceil`, default is `round`

### separator
_*(string)*_ Decimal separator character, default is `.`

### spacer
_*(string)*_ Character between the `result` and `symbol`, default is `" "`

### standard
_*(string)*_ Standard unit of measure, can be `iec` or `jedec`, default is `jedec`; can be overruled by `base`

### symbols
_*(object)*_ Dictionary of SI/JEDEC/IEC symbols to replace for localization, defaults to english if no match is found

### unix
_*(boolean)*_ Enables unix style human readable output, e.g `ls -lh`, default is `false`

## Examples

```javascript
filesize(500);                        // "500 B"
filesize(500, {bits: true});          // "4 Kb"
filesize(265318, {base: 10});         // "265.32 kB"
filesize(265318);                     // "259.1 KB"
filesize(265318, {round: 0});         // "259 KB"
filesize(265318, {output: "array"});  // [259.1, "KB"]
filesize(265318, {output: "object"}); // {value: 259.1, symbol: "KB", exponent: 1, unit: "KB"}
filesize(1, {symbols: {B: "Б"}});     // "1 Б"
filesize(1024);                       // "1 KB"
filesize(1024, {exponent: 0});        // "1024 B"
filesize(1024, {output: "exponent"}); // 1
filesize(265318, {standard: "iec"});  // "259.1 KiB"
filesize(265318, {standard: "iec", fullform: true}); // "259.1 kibibytes"
filesize(12, {fullform: true, fullforms: ["байтов"]});  // "12 байтов"
filesize(265318, {separator: ","});   // "259,1 KB"
filesize(265318, {locale: "de"});   // "259,1 KB"
```

## Partial Application
`filesize.partial()` takes the second parameter of `filesize()` and returns a new function with the configuration applied 
upon execution. This can be used to reduce `Object` creation if you call `filesize()` without caching the `descriptor` 
in lexical scope.

```javascript
const size = filesize.partial({standard: "iec"});

size(265318); // "259.1 KiB"
```

## How can I load filesize.js?
filesize.js supports AMD loaders (require.js, curl.js, etc.), node.js & npm (```npm install filesize```), or using a script tag.

An ES6 version is bundled with an npm install, but requires you load it with the full path, e.g. `require(path.join(__dirname, 'node_modules', 'filesize', 'lib', 'filesize.es6.js'))`.

## License
Copyright (c) 2021 Jason Mulligan
Licensed under the BSD-3 license.
