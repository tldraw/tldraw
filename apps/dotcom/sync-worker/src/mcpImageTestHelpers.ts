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

/** The extended container (VP8X), which is the only one that can say it is animated. */
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

/** A lossy WebP (VP8): the size sits after the frame tag and start code. */
export function webpLossyBytes(w: number, h: number) {
	const bytes = new Uint8Array(30)
	bytes.set(new TextEncoder().encode('RIFF'))
	bytes.set(new TextEncoder().encode('WEBPVP8 '), 8)
	bytes.set([0x9d, 0x01, 0x2a], 23)
	const view = new DataView(bytes.buffer)
	view.setUint16(26, w, true)
	view.setUint16(28, h, true)
	return bytes
}

/** A lossless WebP (VP8L): width and height minus one, packed into 14 bits each. */
export function webpLosslessBytes(w: number, h: number) {
	const bytes = new Uint8Array(30)
	bytes.set(new TextEncoder().encode('RIFF'))
	bytes.set(new TextEncoder().encode('WEBPVP8L'), 8)
	bytes[20] = 0x2f
	new DataView(bytes.buffer).setUint32(21, (w - 1) | ((h - 1) << 14), true)
	return bytes
}

function fromBase64(base64: string) {
	return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
}

// Whole files as encoders write them, to check the readers against more than headers built to
// match them. The first four are a 24x16 test card from ffmpeg, converted with macOS sips; the
// JPEG carries the JFIF, big-endian EXIF and Photoshop segments sips adds ahead of the frame.
// ROTATED_JPEG is that file with its EXIF segment swapped for one saying orientation 6.
// The WebP files are the 1x1 images Modernizr uses to detect each WebP feature.
export const REAL_IMAGES = {
	png: fromBase64(
		'iVBORw0KGgoAAAANSUhEUgAAABgAAAAQCAIAAACDRijCAAAACXBIWXMAAAABAAAAAQBPJcTWAAAAk0lEQVR4nO1UQQ6DMAyzpf2L8jP2stGXhTqlGeWAgF02aVaEgp2YFjUlGqwlNBj1xpBsTYOJ8uh6oActuo5gZC0OZm90G53R9gtnoHW1lrfRVZe1i/oZ+xV9gr/RTxrpDCSPTAyYgcn0zAghlWMnqkYW9XRhgAucivCFW9MUz4o6IONm+rtrJGkzlSnlL898OlwAFqx1NLbGECm7AAAAAElFTkSuQmCC'
	),
	gif: fromBase64(
		'R0lGODdhGAAQAMQAAAAAAAAA/0AA/4AA/8AA//8AAP8AP/8Af/8Av/8A/wA///9AAAB///+AAAC////AAAD/AAD/QAD/gAD/wAD//z//AH//AL//AP//AP///wAAAAAAAAAAAAAAAAAAAAAAACH5BAQAAAAALAAAAAAYABAAAAWTICAWJJQkQYqtUEu9WSwCJHWiKtvWcTbXt1RghWlBeLLRK5gr7ki92ct2EhKNpAIgCZgyh7ojaesTeatN7Jh7xoGdYi17iX6r5eUu3X194qV7VmFZZIBUfINrGQULDQ8YFxYVEBESExQODAoBAgMECQgHBoyOkJKUlpianJ6goqSPkZOVl5mbnZ+hBj8Fh4JwSBkhADs='
	),
	jpeg: fromBase64(
		'/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAGKADAAQAAAABAAAAEAAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgAEAAYAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAEMACQkJCQkJEAkJEBYQEBAWHhYWFhYeJh4eHh4eJi4mJiYmJiYuLi4uLi4uLjc3Nzc3N0BAQEBASEhISEhISEhISP/bAEMBCwwMEhESHxERH0szKjNLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS//dAAQAAv/aAAwDAQACEQMRAD8A5bwjaJ/Ylzfk/MJPLUen3Mn8c4/P1rqfA/8AzG/+A/8AtSqvhexsY/D81sl7G7NJ5hwRkfdGMbvYfnV7RI10m31KayYXrTY3pH1j+/1xu9fbpV161HE5XXwmH+NuPRpaSi/idl+JniMROjSlRxT97mdtL+7ypLVXW9+vmafh3VprbxSNOILpdAoMk/IVjMmQPfbgj3z259arwPR5r59bj1mK0keS3JZoFBJ+aNk5OMjrnpXoX/CV6z/0Bbj/AMe/+N1hRw9WjTjTq7pd0/xTZ6dPLpyo0XRivgjfVLXlV+v/AA+5/9k='
	),
	rotatedJpeg: fromBase64(
		'/9j/4AAQSkZJRgABAQAASABIAAD/4QAeRXhpZgAASUkqAAgAAAABABIBAwABAAAABgAAAP/tADhQaG90b3Nob3AgMy4wADhCSU0EBAAAAAAAADhCSU0EJQAAAAAAENQdjNmPALIE6YAJmOz4Qn7/wAARCAAQABgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9sAQwAJCQkJCQkQCQkQFhAQEBYeFhYWFh4mHh4eHh4mLiYmJiYmJi4uLi4uLi4uNzc3Nzc3QEBAQEBISEhISEhISEhI/9sAQwELDAwSERIfEREfSzMqM0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tL/90ABAAC/9oADAMBAAIRAxEAPwDlvCNon9iXN+T8wk8tR6fcyfxzj8/Wup8D/wDMb/4D/wC1Kq+F7Gxj8PzWyXsbs0nmHBGR90Yxu9h+dXtEjXSbfUprJhetNjekfWP7/XG719ulXXrUcTldfCYf4249GlpKL+J2X4meIxE6NKVHFP3uZ20v7vKktVdb36+Zp+HdWmtvFI04gul0CgyT8hWMyZA99uCPfPbn1qvA9Hmvn1uPWYrSR5LclmgUEn5o2Tk4yOuelehf8JXrP/QFuP8Ax7/43WFHD1aNONOrul3T/FNnp08unKjRdGK+CN9UteVX6/8AD7n/2Q=='
	),
	webpLossy: fromBase64('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA'),
	webpLossless: fromBase64('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA=='),
	webpAlpha: fromBase64(
		'UklGRkoAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAwAAAARBxAR/Q9ERP8DAABWUDggGAAAABQBAJ0BKgEAAQAAAP4AAA3AAP7mtQAAAA=='
	),
	webpAnimated: fromBase64(
		'UklGRlIAAABXRUJQVlA4WAoAAAASAAAAAAAAAAAAQU5JTQYAAAD/////AABBTk1GJgAAAAAAAAAAAAAAAAAAAGQAAABWUDhMDQAAAC8AAAAQBxAREYiI/gcA'
	),
}
