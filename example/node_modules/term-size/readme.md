# term-size [![Build Status](https://travis-ci.com/sindresorhus/term-size.svg?branch=master)](https://travis-ci.com/github/sindresorhus/term-size)

> Reliably get the terminal window size

Because [`process.stdout.columns`](https://nodejs.org/api/tty.html#tty_writestream_columns) doesn't exist when run [non-interactively](http://www.tldp.org/LDP/abs/html/intandnonint.html), for example, in a child process or when piped. This module even works when all the TTY file descriptors are redirected!

Confirmed working on macOS, Linux, and Windows.

## Install

```
$ npm install term-size
```

## Usage

```js
const termSize = require('term-size');

termSize();
//=> {columns: 143, rows: 24}
```

## API

### termSize()

Returns an `object` with `columns` and `rows` properties.

## Info

The bundled macOS binary is signed and hardened.

## Related

- [term-size-cli](https://github.com/sindresorhus/term-size-cli) - CLI for this module

---

<div align="center">
	<b>
		<a href="https://tidelift.com/subscription/pkg/npm-term-size?utm_source=npm-term-size&utm_medium=referral&utm_campaign=readme">Get professional support for this package with a Tidelift subscription</a>
	</b>
	<br>
	<sub>
		Tidelift helps make open source sustainable for maintainers while giving companies<br>assurances about security, maintenance, and licensing for their dependencies.
	</sub>
</div>
