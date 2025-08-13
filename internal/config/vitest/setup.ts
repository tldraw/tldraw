// Shared Vitest setup file - equivalent to setupFiles in Jest
// This file is imported by all packages using the Vitest preset

// Polyfill for requestAnimationFrame (equivalent to raf/polyfill)
if (typeof globalThis.requestAnimationFrame === 'undefined') {
	globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
		return setTimeout(() => cb(Date.now()), 16) as unknown as number
	}
}

if (typeof globalThis.cancelAnimationFrame === 'undefined') {
	globalThis.cancelAnimationFrame = (id: number) => {
		clearTimeout(id)
	}
}

// Crypto polyfill (needed for ai package)
if (typeof globalThis.crypto === 'undefined') {
	const { Crypto } = require('@peculiar/webcrypto')
	globalThis.crypto = new Crypto()
}
