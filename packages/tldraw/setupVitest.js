// Vitest setup file for tldraw package
// Converted from setupTests.js to provide the same polyfills and global setup

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

// Window.matchMedia polyfill for media queries
// Use a conditional approach to avoid conflicts with jsdom
if (!window.matchMedia || typeof window.matchMedia !== 'function') {
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
}

// URL.createObjectURL polyfill for blob handling
Object.defineProperty(global.URL, 'createObjectURL', {
	writable: true,
	value: () => 'mock-object-url',
})

// Extract version from package.json (same as original setup)
const { version } = require('./package.json')

// Window fetch mock for network requests - handles translation loading
window.fetch = async (input, init) => {
	if (input === `https://cdn.tldraw.com/${version}/translations/en.json`) {
		const json = await import('@tldraw/assets/translations/main.json')
		return {
			ok: true,
			json: async () => json.default,
		}
	}

	if (input === '/icons/icon/icon-names.json') {
		return {
			ok: true,
			json: async () => [],
		}
	}

	// Handle font requests (tldraw_draw, etc.) - return mock font data
	if (
		typeof input === 'string' &&
		(input.includes('tldraw_draw') ||
			input.includes('.woff') ||
			input.includes('.ttf') ||
			input.includes('font'))
	) {
		return {
			ok: true,
			arrayBuffer: async () => new ArrayBuffer(0),
			blob: async () => new Blob([''], { type: 'font/woff2' }),
		}
	}

	throw new Error(`Unhandled request: ${input}`)
}

// DOMRect polyfill for DOM rectangle calculations
window.DOMRect = class DOMRect {
	static fromRect(rect) {
		return new DOMRect(rect.x, rect.y, rect.width, rect.height)
	}
	constructor(x, y, width, height) {
		this.x = x
		this.y = y
		this.width = width
		this.height = height
	}
}

// Text encoding/decoding polyfills
global.TextEncoder = require('util').TextEncoder
global.TextDecoder = require('util').TextDecoder

// Image API polyfills for jsdom - add decode method to HTMLImageElement prototype
if (typeof HTMLImageElement !== 'undefined') {
	if (!HTMLImageElement.prototype.decode) {
		HTMLImageElement.prototype.decode = function () {
			return Promise.resolve()
		}
	}
}

// window.getComputedStyle polyfill to prevent jsdom warnings
// Override jsdom's implementation with a silent one
Object.defineProperty(window, 'getComputedStyle', {
	writable: true,
	configurable: true,
	value: function (element, pseudoElt) {
		// Create a mock CSSStyleDeclaration
		const style = {
			getPropertyValue: function (property) {
				// Handle common properties that tldraw might need
				switch (property) {
					case 'display':
						return 'block'
					case 'position':
						return 'static'
					case 'width':
						return '0px'
					case 'height':
						return '0px'
					case 'margin':
						return '0px'
					case 'padding':
						return '0px'
					case 'border':
						return '0px'
					case 'font-family':
						return 'serif'
					case 'font-size':
						return '16px'
					case 'line-height':
						return 'normal'
					case 'color':
						return 'rgb(0, 0, 0)'
					case 'background-color':
						return 'rgba(0, 0, 0, 0)'
					default:
						return ''
				}
			},
			setProperty: function (property, value) {
				this[property] = value
			},
			removeProperty: function (property) {
				delete this[property]
				return ''
			},
		}

		// Add common CSS properties
		const commonProps = [
			'display',
			'position',
			'width',
			'height',
			'margin',
			'padding',
			'border',
			'font-family',
			'font-size',
			'line-height',
			'color',
			'background-color',
		]
		commonProps.forEach((prop) => {
			style[prop] = style.getPropertyValue(prop)
		})

		return style
	},
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
			return ''
		}
	}
}
