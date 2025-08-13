// Polyfill for requestAnimationFrame (equivalent to raf/polyfill)
if (typeof globalThis.requestAnimationFrame === 'undefined') {
	globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
		return setTimeout(() => cb(Date.now()), 16)
	}
}

if (typeof globalThis.cancelAnimationFrame === 'undefined') {
	globalThis.cancelAnimationFrame = (id: number) => {
		clearTimeout(id)
	}
}
