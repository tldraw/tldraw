// Loaded as a classic script from index.html, ahead of the app's module script, so it runs before
// any bundled code evaluates. Zero's schema builder calls Object.hasOwn at module load, which left
// a blank page on 2021-era browsers (Chrome/Edge < 93, Safari < 15.4, Samsung Internet 16). See #10135.
;(function () {
	function define(target, name, value) {
		if (typeof target[name] === 'function') return
		// Non-enumerable like the native versions, so for-in loops over arrays and objects are unaffected.
		Object.defineProperty(target, name, { value: value, writable: true, configurable: true })
	}

	define(Object, 'hasOwn', function hasOwn(object, key) {
		if (object == null) throw new TypeError('Cannot convert undefined or null to object')
		return Object.prototype.hasOwnProperty.call(Object(object), key)
	})

	function at(index) {
		var length = this.length
		var i = Math.trunc(index) || 0
		if (i < 0) i += length
		return i < 0 || i >= length ? undefined : this[i]
	}
	define(Array.prototype, 'at', at)
	define(String.prototype, 'at', at)
})()
