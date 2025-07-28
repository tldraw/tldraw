require('fake-indexeddb/auto')
global.ResizeObserver = require('resize-observer-polyfill')
global.crypto ??= new (require('@peculiar/webcrypto').Crypto)()
global.FontFace = class FontFace {
	load() {
		return Promise.resolve()
	}
}
document.fonts = {
	add: () => {},
	delete: () => {},
	forEach: () => {},
}

global.TextEncoder = require('util').TextEncoder
global.TextDecoder = require('util').TextDecoder

global.TransformStream = require('node:stream/web').TransformStream
global.DecompressionStream = require('node:stream/web').DecompressionStream
global.CompressionStream = require('node:stream/web').CompressionStream
global.ReadableStream = require('node:stream/web').ReadableStream
global.WritableStream = require('node:stream/web').WritableStream
