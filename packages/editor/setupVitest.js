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

// Mock PointerEvent for jsdom
if (typeof window !== 'undefined' && !window.PointerEvent) {
	global.PointerEvent = class PointerEvent extends Event {
		pointerId = 1
		pointerType = 'mouse'
		clientX = 0
		clientY = 0

		constructor(type, options = {}) {
			super(type, options)
			this.pointerId = options.pointerId || 1
			this.pointerType = options.pointerType || 'mouse'
			this.clientX = options.clientX || 0
			this.clientY = options.clientY || 0
		}
	}
}

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

// Mock TouchEvent for jsdom
if (typeof window !== 'undefined' && !window.TouchEvent) {
	global.TouchEvent = class TouchEvent extends Event {
		touches = []

		constructor(type, options = {}) {
			super(type, options)
			this.touches = options.touches || []
		}
	}
}
