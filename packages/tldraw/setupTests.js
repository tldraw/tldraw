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

Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: jest.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: jest.fn(), // Deprecated
		removeListener: jest.fn(), // Deprecated
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
		dispatchEvent: jest.fn(),
	})),
})

Object.defineProperty(global.URL, 'createObjectURL', {
	writable: true,
	value: jest.fn(),
})

window.fetch = async (input, init) => {
	if (input === 'https://unpkg.com/@tldraw/assets@2.0.0-alpha.12/translations/en.json') {
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

	throw new Error(`Unhandled request: ${input}`)
}
