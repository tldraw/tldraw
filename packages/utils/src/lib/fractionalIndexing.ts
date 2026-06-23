// Fractional indexing, specialized to tldraw's needs.
//
// This is a vendored and trimmed version of the `fractional-indexing` (by
// arv@rocicorp.dev) and `jittered-fractional-indexing` (by
// github@nathanhleung.com) packages, both released under CC0-1.0 (public
// domain). See https://observablehq.com/@dgreensp/implementing-fractional-indexing
// for the original algorithm.
//
// We only ever use the default base-62 alphabet, so the `digits` parameter has
// been specialized away. This lets us hoist the per-call allocations that the
// upstream `validateOrderKey` made (notably `digits[0].repeat(26)`) into module
// constants, and skip redundant re-validation inside the jitter loop, which are
// both on hot paths (every index generation and every IndexKey validation).

// Digits must be in ascending character-code order.
const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const ZERO = DIGITS[0] // '0'
const LARGEST_DIGIT = DIGITS[DIGITS.length - 1] // 'z'
// The reserved "smallest integer" key, which has no valid predecessor.
const SMALLEST_INTEGER = 'A' + ZERO.repeat(26)
// Number of random bisections used to spread concurrently-generated keys apart,
// reducing the chance of collisions when multiple clients insert into the same
// gap at once. Each bit costs one extra key generation and ~0.17 characters of
// key length, so this trades collision resistance against compute and key size.
//
// This is the upstream `jittered-fractional-indexing` default. The collision
// margin has to cover the worst case of many keys generated into the *same*
// gap at once — e.g. an offline client that reordered a heavily-populated page
// reconnecting and merging its keys in one batch. At our 4000-shape ceiling the
// birthday-collision odds for that worst case are ~0.7% at 30 bits, versus
// effectively certain at 16. Colliding index keys are what caused the duplicate
// z-order bugs that motivated jitter in the first place (#3932, #4126, #4210,
// #5864, #6141), so we keep the conservative margin.
const JITTER_BITS = 30

function getIntegerLength(head: string): number {
	if (head >= 'a' && head <= 'z') {
		return head.charCodeAt(0) - 'a'.charCodeAt(0) + 2
	} else if (head >= 'A' && head <= 'Z') {
		return 'Z'.charCodeAt(0) - head.charCodeAt(0) + 2
	}
	throw new Error('invalid order key head: ' + head)
}

function getIntegerPart(key: string): string {
	const integerPartLength = getIntegerLength(key[0])
	if (integerPartLength > key.length) {
		throw new Error('invalid order key: ' + key)
	}
	return key.slice(0, integerPartLength)
}

// Map a base-62 digit to its value. Faster than DIGITS.indexOf() (which scans
// the alphabet) on the hot key-generation path. DIGITS is in char-code order:
// '0'-'9' -> 0-9, 'A'-'Z' -> 10-35, 'a'-'z' -> 36-61.
function digitIndex(char: string): number {
	const code = char.charCodeAt(0)
	if (code <= 57) return code - 48
	if (code <= 90) return code - 55
	return code - 61
}

/**
 * Throws if `key` is not a canonical order key. Allocation-free in the common
 * case: no `repeat`/`slice` per call.
 */
export function validateOrderKey(key: string): void {
	if (key === SMALLEST_INTEGER) {
		throw new Error('invalid order key: ' + key)
	}
	// getIntegerPart throws if the first character is bad or the key is too short.
	const i = getIntegerPart(key)
	// The fractional part (everything after the integer part) must not end in the
	// smallest digit, as a trailing zero is a non-canonical representation.
	if (key.length > i.length && key[key.length - 1] === ZERO) {
		throw new Error('invalid order key: ' + key)
	}
}

// `a` may be empty string, `b` is null or non-empty string.
// `a < b` lexicographically if `b` is non-null. No trailing zeros allowed.
function midpoint(a: string, b: string | null): string {
	if (b != null && a >= b) {
		throw new Error(a + ' >= ' + b)
	}
	if (a.slice(-1) === ZERO || (b && b.slice(-1) === ZERO)) {
		throw new Error('trailing zero')
	}
	if (b) {
		// Remove the longest common prefix, padding `a` with zeros as we go. We
		// don't need to pad `b`, because it can't end before `a` while traversing
		// the common prefix.
		let n = 0
		while ((a[n] || ZERO) === b[n]) {
			n++
		}
		if (n > 0) {
			return b.slice(0, n) + midpoint(a.slice(n), b.slice(n))
		}
	}
	// First digits (or lack of digit) are different.
	const digitA = a ? digitIndex(a[0]) : 0
	const digitB = b != null ? digitIndex(b[0]) : DIGITS.length
	if (digitB - digitA > 1) {
		const midDigit = Math.round(0.5 * (digitA + digitB))
		return DIGITS[midDigit]
	}
	// First digits are consecutive.
	if (b && b.length > 1) {
		return b.slice(0, 1)
	}
	// `b` is null or has length 1 (a single digit). The first digit of `a` is the
	// previous digit to `b`, or the largest digit if `b` is null.
	return DIGITS[digitA] + midpoint(a.slice(1), null)
}

// May return null, as there is a largest integer.
function incrementInteger(x: string): string | null {
	const [head, ...digs] = x.split('')
	let carry = true
	for (let i = digs.length - 1; carry && i >= 0; i--) {
		const d = digitIndex(digs[i]) + 1
		if (d === DIGITS.length) {
			digs[i] = ZERO
		} else {
			digs[i] = DIGITS[d]
			carry = false
		}
	}
	if (carry) {
		if (head === 'Z') return 'a' + ZERO
		if (head === 'z') return null
		const h = String.fromCharCode(head.charCodeAt(0) + 1)
		if (h > 'a') {
			digs.push(ZERO)
		} else {
			digs.pop()
		}
		return h + digs.join('')
	}
	return head + digs.join('')
}

// May return null, as there is a smallest integer.
function decrementInteger(x: string): string | null {
	const [head, ...digs] = x.split('')
	let borrow = true
	for (let i = digs.length - 1; borrow && i >= 0; i--) {
		const d = digitIndex(digs[i]) - 1
		if (d === -1) {
			digs[i] = LARGEST_DIGIT
		} else {
			digs[i] = DIGITS[d]
			borrow = false
		}
	}
	if (borrow) {
		if (head === 'a') return 'Z' + LARGEST_DIGIT
		if (head === 'A') return null
		const h = String.fromCharCode(head.charCodeAt(0) - 1)
		if (h < 'Z') {
			digs.push(LARGEST_DIGIT)
		} else {
			digs.pop()
		}
		return h + digs.join('')
	}
	return head + digs.join('')
}

// Generate a key strictly between `a` and `b`, without validating the inputs.
// `a`/`b` are order keys or null (START/END). `a < b` if both are non-null.
function keyBetweenUnchecked(a: string | null, b: string | null): string {
	if (a != null && b != null && a >= b) {
		throw new Error(a + ' >= ' + b)
	}
	if (a == null) {
		if (b == null) return 'a' + ZERO
		const ib = getIntegerPart(b)
		const fb = b.slice(ib.length)
		if (ib === SMALLEST_INTEGER) {
			return ib + midpoint('', fb)
		}
		if (ib < b) return ib
		const res = decrementInteger(ib)
		if (res == null) throw new Error('cannot decrement any more')
		return res
	}
	if (b == null) {
		const ia = getIntegerPart(a)
		const fa = a.slice(ia.length)
		const i = incrementInteger(ia)
		return i == null ? ia + midpoint(fa, null) : i
	}
	const ia = getIntegerPart(a)
	const fa = a.slice(ia.length)
	const ib = getIntegerPart(b)
	const fb = b.slice(ib.length)
	if (ia === ib) {
		return ia + midpoint(fa, fb)
	}
	const i = incrementInteger(ia)
	if (i == null) throw new Error('cannot increment any more')
	if (i < b) return i
	return ia + midpoint(fa, null)
}

// Generate `n` keys between `a` and `b`, without validating the inputs.
// Intermediate keys are valid by construction, so they're never re-validated.
function nKeysBetweenUnchecked(a: string | null, b: string | null, n: number): string[] {
	if (n === 0) return []
	if (n === 1) return [keyBetweenUnchecked(a, b)]
	if (b == null) {
		let c = keyBetweenUnchecked(a, b)
		const result = [c]
		for (let i = 0; i < n - 1; i++) {
			c = keyBetweenUnchecked(c, b)
			result.push(c)
		}
		return result
	}
	if (a == null) {
		let c = keyBetweenUnchecked(a, b)
		const result = [c]
		for (let i = 0; i < n - 1; i++) {
			c = keyBetweenUnchecked(a, c)
			result.push(c)
		}
		result.reverse()
		return result
	}
	const mid = Math.floor(n / 2)
	const c = keyBetweenUnchecked(a, b)
	return [...nKeysBetweenUnchecked(a, c, mid), c, ...nKeysBetweenUnchecked(c, b, n - mid - 1)]
}

// Bisect `[low, high]` JITTER_BITS times, following a random walk, so that keys
// generated concurrently land in different sub-ranges. `low`/`high` must already
// be valid (or null); the intermediate midpoints are valid by construction.
function jitterBetween(low: string | null, high: string | null): string {
	let mid = keyBetweenUnchecked(low, high)
	for (let i = 0; i < JITTER_BITS; i++) {
		if (Math.random() < 0.5) {
			low = mid
		} else {
			high = mid
		}
		mid = keyBetweenUnchecked(low, high)
	}
	return mid
}

/**
 * Generate `n` jittered keys evenly spaced between `a` and `b`. Inputs are
 * validated once; everything downstream is generated, hence trusted.
 */
export function generateNJitteredKeysBetween(
	a: string | null,
	b: string | null,
	n: number
): string[] {
	if (n === 0) return []
	if (a != null) validateOrderKey(a)
	if (b != null) validateOrderKey(b)
	const keys = nKeysBetweenUnchecked(a, b, n + 1)
	const result = new Array<string>(n)
	for (let i = 0; i < n; i++) {
		result[i] = jitterBetween(keys[i], keys[i + 1])
	}
	return result
}

/**
 * Generate `n` keys evenly spaced between `a` and `b`, without jitter. Used in
 * tests for deterministic output.
 */
export function generateNKeysBetween(a: string | null, b: string | null, n: number): string[] {
	if (n === 0) return []
	if (a != null) validateOrderKey(a)
	if (b != null) validateOrderKey(b)
	return nKeysBetweenUnchecked(a, b, n)
}
