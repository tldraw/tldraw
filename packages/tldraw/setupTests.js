require('fake-indexeddb/auto')
require('jest-canvas-mock')
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

global.matchMedia = () => false
