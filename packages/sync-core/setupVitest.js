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

// jsdom ships a global WebSocket built on its bundled copy of undici. In this jsdom test
// environment its events are created in a different realm than the Node EventTarget they're
// dispatched on, so connecting throws "The 'event' argument must be an instance of Event". Use
// the `ws` package's WebSocket for client connections instead, matching the WebSocketServer the
// tests connect to.
global.WebSocket = require('ws').WebSocket

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
