globalThis.requestAnimationFrame =
	globalThis.requestAnimationFrame ||
	function requestAnimationFrame(cb) {
		return setTimeout(cb, 1000 / 60)
	}

export {}
