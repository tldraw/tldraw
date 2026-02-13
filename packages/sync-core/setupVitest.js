// IndexedDB polyfill for browser storage testing
require('fake-indexeddb/auto')

// ResizeObserver polyfill for DOM observation testing
global.ResizeObserver = require('resize-observer-polyfill')

// Crypto polyfill for cryptographic operations
global.crypto ??= new (require('@peculiar/webcrypto').Crypto)()

// FontFace API polyfill for font testing
global.FontFace = class FontFace {
	load() {
		return Promise.resolve()
	}
}

// Document fonts API mock
document.fonts = {
	add: () => {},
	delete: () => {},
	forEach: () => {},
}

// Text encoding/decoding polyfills
global.TextEncoder = require('util').TextEncoder
global.TextDecoder = require('util').TextDecoder

// Window.matchMedia polyfill for media queries
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: (query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: () => {},
		removeListener: () => {},
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => {},
	}),
})
