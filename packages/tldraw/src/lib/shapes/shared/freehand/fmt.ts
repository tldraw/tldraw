// Fast SVG path data building.
//
// Browsers don't render differences below a hundredth of a pixel, so we emit at most 2 decimal
// places. Stringifying doubles rounded to 2 decimals is slow (they routinely miss V8's fast
// float-to-string path), and concatenating many small strings costs more than the math itself.
// Instead we round every coordinate to an integer number of hundredths ("centi-pixels") and
// write decimal digits straight into a byte buffer, decoding to a string once per path.
//
// Paths use relative commands (t/q/a/l) wherever possible: deltas between consecutive points
// are small numbers, which keeps the path data compact. Because deltas are differences of the
// rounded integers, they sum back to the rounded absolute positions exactly: no drift.

let buf = new Uint8Array(65536)
let pos = 0
const decoder = new TextDecoder()

function ensure(n: number) {
	if (pos + n > buf.length) {
		const next = new Uint8Array(buf.length * 2)
		next.set(buf)
		buf = next
	}
}

/** Start a new path. Builders must call this before writing. */
export function resetPath() {
	pos = 0
}

/** Append a string of ASCII characters (command letters, arc flags) to the path. */
export function writeStr(s: string) {
	ensure(s.length)
	for (let i = 0; i < s.length; i++) {
		buf[pos++] = s.charCodeAt(i)
	}
}

/**
 * Append a value given in integer hundredths, e.g. 255 as `2.55`, -30 as `-.3`, 0 as `0`.
 * Assumes |n| < 2^31, which holds for canvas coordinates (|v| < ~21 million px).
 */
export function writeC(n: number) {
	ensure(16)
	if (n < 0) {
		buf[pos++] = 45 // '-'
		n = -n
	}
	const i = (n / 100) | 0
	const f = n - i * 100
	if (i === 0) {
		if (f === 0) {
			buf[pos++] = 48 // '0'
			return
		}
	} else if (i < 10) {
		buf[pos++] = 48 + i
	} else if (i < 100) {
		buf[pos++] = 48 + ((i / 10) | 0)
		buf[pos++] = 48 + (i % 10)
	} else {
		const start = pos
		let m = i
		while (m > 0) {
			buf[pos++] = 48 + (m % 10)
			m = (m / 10) | 0
		}
		// digits came out least-significant first; reverse them
		let lo = start
		let hi = pos - 1
		while (lo < hi) {
			const t = buf[lo]
			buf[lo] = buf[hi]
			buf[hi] = t
			lo++
			hi--
		}
	}
	if (f !== 0) {
		buf[pos++] = 46 // '.'
		const d2 = f % 10
		buf[pos++] = 48 + ((f / 10) | 0)
		if (d2 !== 0) {
			buf[pos++] = 48 + d2
		}
	}
}

/** Append a coordinate pair given in integer hundredths as `x,y `. */
export function writeCPair(nx: number, ny: number) {
	writeC(nx)
	buf[pos++] = 44 // ','
	writeC(ny)
	buf[pos++] = 32 // ' '
}

/** Finish the path: decode everything written since `resetPath` and reset the writer. */
export function finishPath(): string {
	const s = decoder.decode(buf.subarray(0, pos))
	pos = 0
	return s
}

/** Round a coordinate to integer hundredths. */
export function toCenti(v: number): number {
	return Math.round(v * 100)
}
