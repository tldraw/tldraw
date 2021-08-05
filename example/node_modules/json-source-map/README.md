# json-source-map
Parse/stringify JSON and provide source-map for JSON-pointers to all nodes.

NEW: supports BigInt, Maps, Sets and Typed arrays.

[![Build Status](https://travis-ci.org/epoberezkin/json-source-map.svg?branch=master)](https://travis-ci.org/epoberezkin/json-source-map)
[![npm version](https://badge.fury.io/js/json-source-map.svg)](https://www.npmjs.com/package/json-source-map)
[![Coverage Status](https://coveralls.io/repos/github/epoberezkin/json-source-map/badge.svg?branch=master)](https://coveralls.io/github/epoberezkin/json-source-map?branch=master)


## Install

```bash
npm install json-source-map
```


## Possible use cases

#### Source maps

When a domain-specific language that compiles to JavaScript uses JSON as a format, this module can be used as a replacement for standard JSON to simplify generation of source maps.

#### Editing forms/JSON

When a form also allows to edit JSON representation of data on the same screen, this module can be used to sinchronise navigation in JSON and in the form.


## Usage

#### Stringify

```javascript
var jsonMap = require('json-source-map');
var result = jsonMap.stringify({ foo: 'bar' }, null, 2);
console.log('json:');
console.log(result.json);
console.log('\npointers:');
console.log(result.pointers);
```

output:

```text
json:
{
  "foo": "bar"
}

pointers:
{ '':
   { value: { line: 0, column: 0, pos: 0 },
     valueEnd: { line: 2, column: 1, pos: 18 } },
  '/foo':
   { key: { line: 1, column: 2, pos: 4 },
     keyEnd: { line: 1, column: 7, pos: 9 },
     value: { line: 1, column: 9, pos: 11 },
     valueEnd: { line: 1, column: 14, pos: 16 } } }
```


#### Parse

```javascript
var result = jsonMap.parse('{ "foo": "bar" }');
console.log('data:')
console.log(result.data);
console.log('\npointers:');
console.log(result.pointers);
```

output:
```text
data:
{ foo: 'bar' }

pointers:
{ '':
   { value: { line: 0, column: 0, pos: 0 },
     valueEnd: { line: 0, column: 16, pos: 16 } },
  '/foo':
   { key: { line: 0, column: 2, pos: 2 },
     keyEnd: { line: 0, column: 7, pos: 7 },
     value: { line: 0, column: 9, pos: 9 },
     valueEnd: { line: 0, column: 14, pos: 14 } } }
```


## API

#### .parse(String json, Any _, Object options) -&gt; Object;

Parses JSON string. Returns object with properties:
- _data_: parsed data.
- _pointers_: an object where each key is a JSON pointer ([RFC 6901](https://tools.ietf.org/html/rfc6901)), each corresponding value is a mapping object.

Mapping object has properties:
- _key_: location object (see below) of the beginning of the key in JSON string. This property is only present if parent data is an object (rather than array).
- _keyEnd_: location of the end of the key in JSON string. This property is only present if parent data is an object.
- _value_: location of the beginning of the value in JSON string.
- _valueEnd_: location of the end of the value in JSON string.

Location object has properties (zero-based numbers):
- _line_: line number in JSON file.
- _column_: column number in JSON string (from the beginning of line).
- _pos_: character position in JSON file (from the beginning of JSON string).

Options:
- _bigint_: parse large integers as [BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt).

Whitespace:
- the only character that increases line number in mappings is line feed ('\n'), so if your JSON string has '\r\n' sequence, it will still be counted as one line,
- both '\r' and '\n' are counted as a character when determining `pos` (it is possible to slice sections of JSON string using `pos` property), but `column` counter is reset when `r` or `n` is encountered,
- tabs ('\t') are counted as four spaces when determining `column` but as a single character for `pos`.

Comparison with the standard `JSON.parse`:
- when it is not possible to parse JSON, a SyntaxError exception with exactly the same message is thrown,
- `reviver` parameter of [JSON.parse](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse#Using_the_reviver_parameter) is not supported, but its position is reserved.
- supports parsing large integers as [BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt) (with the option `bigint: true`).


#### .stringify(Any data, Any _, String|Number|Object space) -&gt; Object;

Stringifies JavaScript data. Returns object with properties:
- _json_: JSON string - stringified data.
- _pointers_: an object where each key is a JSON-pointer, each corresponding value is a mapping object (same format as in parse method).

Comparison with the standard `JSON.stringify`:
- `replacer` parameter of [JSON.stringify](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#The_replacer_parameter) is not supported, but its position is reserved.
- `space` parameter is supported, but if it is a string, it may only contain characters space, tab ('\t'), caret return ('\r') and line feed ('\n') - using any other caracter throws an exception. If this parameter is an object, it is options.

Options:
- _space_: same as `space` parameter.
- _es6_: stringify ES6 Maps, Sets and Typed arrays (as JSON arrays).


## License

[MIT](https://github.com/epoberezkin/json-source-map/blob/master/LICENSE)
