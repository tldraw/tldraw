// Image files cut down to the header bytes readImageInfo looks at.

export function pngBytes(w: number, h: number) {
	const bytes = new Uint8Array(24)
	bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52])
	const view = new DataView(bytes.buffer)
	view.setUint32(16, w)
	view.setUint32(20, h)
	return bytes
}

export function gifBytes(w: number, h: number) {
	const bytes = new Uint8Array(10)
	bytes.set(new TextEncoder().encode('GIF89a'))
	const view = new DataView(bytes.buffer)
	view.setUint16(6, w, true)
	view.setUint16(8, h, true)
	return bytes
}

export function webpBytes(w: number, h: number, { animated = false } = {}) {
	const bytes = new Uint8Array(30)
	bytes.set(new TextEncoder().encode('RIFF'))
	bytes.set(new TextEncoder().encode('WEBPVP8X'), 8)
	bytes[20] = animated ? 0x02 : 0
	const view = new DataView(bytes.buffer)
	view.setUint16(24, w - 1, true)
	view.setUint16(27, h - 1, true)
	return bytes
}

/** `orientation` is the EXIF tag: 1 is upright, 6 a quarter turn. */
export function jpegBytes(w: number, h: number, orientation?: number) {
	const exif =
		orientation === undefined
			? []
			: [
					...[0xff, 0xe1, 0x00, 0x1e],
					...[0x45, 0x78, 0x69, 0x66, 0x00, 0x00],
					...[0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00],
					...[0x01, 0x00],
					...[0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, orientation, 0x00, 0x00, 0x00],
				]
	const frame = [0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 0xff, w >> 8, w & 0xff]
	return new Uint8Array([0xff, 0xd8, ...exif, ...frame, ...new Array(12).fill(0)])
}
