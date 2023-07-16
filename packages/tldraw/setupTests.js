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
	[Symbol.iterator]: () => [][Symbol.iterator](),
}

global.matchMedia = () => false

Object.defineProperty(global.URL, 'createObjectURL', {
	writable: true,
	value: jest.fn(),
})
