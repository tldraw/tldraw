// Vitest setup file for editor package

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
	[Symbol.iterator]: () => [][Symbol.iterator](),
}

// Window fetch mock for network requests
window.fetch = async (input, init) => {
	return {
		ok: true,
		json: async () => [],
	}
}

// Window.matchMedia polyfill for media queries
// Use a conditional approach to avoid conflicts with jsdom
window.matchMedia = (query) => ({
	matches: false,
	media: query,
	onchange: null,
	addListener: () => {},
	removeListener: () => {},
	addEventListener: () => {},
	removeEventListener: () => {},
	dispatchEvent: () => {},
})

// Mock DragEvent for jsdom
if (typeof window !== 'undefined' && !window.DragEvent) {
	global.DragEvent = class DragEvent extends Event {
		dataTransfer = {
			getData: () => '',
			setData: () => {},
			files: [],
		}

		constructor(type, options = {}) {
			super(type, options)
			this.dataTransfer = options.dataTransfer || {
				getData: () => '',
				setData: () => {},
				files: [],
			}
		}
	}
}
