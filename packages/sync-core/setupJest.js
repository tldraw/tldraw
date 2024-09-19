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
