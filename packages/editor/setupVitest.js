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

// Text encoding/decoding polyfills
global.TextEncoder = require('util').TextEncoder
global.TextDecoder = require('util').TextDecoder

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

// Enhanced DOM API mocking for CSSStyleDeclaration
// This ensures all HTML elements have the required style methods
if (typeof CSSStyleDeclaration !== 'undefined') {
	if (!CSSStyleDeclaration.prototype.getPropertyValue) {
		CSSStyleDeclaration.prototype.getPropertyValue = function (property) {
			return this[property] || ''
		}
	}
	if (!CSSStyleDeclaration.prototype.setProperty) {
		CSSStyleDeclaration.prototype.setProperty = function (property, value) {
			this[property] = value
		}
	}
	if (!CSSStyleDeclaration.prototype.removeProperty) {
		CSSStyleDeclaration.prototype.removeProperty = function (property) {
			delete this[property]
		}
	}
}
