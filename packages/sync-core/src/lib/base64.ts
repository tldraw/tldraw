export class Base64EncodeStream extends TransformStream {
	constructor() {
		let buffer = new Uint8Array(1024) // Start with a reasonable buffer size
		let offset = 0

		const growBuffer = (size: number) => {
			const newSize = Math.max(buffer.length * 2, size)
			const newBuffer = new Uint8Array(newSize)
			newBuffer.set(buffer.slice(0, offset))
			buffer = newBuffer
		}
		const encoder = new TextEncoder()

		super({
			transform(chunk, controller) {
				// Write chunk to buffer
				if (typeof chunk === 'string') {
					// https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder/encodeInto#buffer_sizing
					if (offset + chunk.length * 3 > buffer.length) {
						growBuffer(offset + chunk.length * 3)
					}
					const x = encoder.encodeInto(chunk, buffer.subarray(offset))
					offset += x.written
				} else if (
					chunk instanceof Uint8Array ||
					// silly jsdom creates a different Uint8Array class so instanceof check doesn't work in tests
					(process.env.NODE_ENV === 'test' && 'byteLength' in chunk)
				) {
					if (offset + chunk.length > buffer.length) {
						growBuffer(offset + chunk.length)
					}
					buffer.set(chunk, offset)
					offset += chunk.length
				} else {
					throw new TypeError(
						'Chunk must be a Uint8Array or string' + Object.prototype.toString.call(chunk)
					)
				}

				// Process in groups of 3 bytes (which encode to 4 base64 characters)
				const completeGroups = Math.floor(offset / 3)
				const encodableBytes = completeGroups * 3

				if (encodableBytes < 1024) {
					// don't bother encoding yet if the buffer is small
					return
				}

				controller.enqueue(encodeBase64(buffer.slice(0, encodableBytes)))

				// Move remaining bytes to start of buffer
				const remainingBytes = offset - encodableBytes
				if (remainingBytes > 0) {
					buffer.copyWithin(0, encodableBytes, offset)
				}
				offset = remainingBytes
			},

			flush(controller) {
				// Handle any remaining bytes with padding
				if (offset > 0) {
					controller.enqueue(encodeBase64(buffer.slice(0, offset)))
				}
			},
		})
	}
}

const alphabet = Uint8Array.from(
	'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
	(c) => c.charCodeAt(0)
)
const equals = '='.charCodeAt(0)

// Create reverse lookup table for decoding
const decodeTable = new Uint8Array(128)
for (let i = 0; i < alphabet.length; i++) {
	decodeTable[alphabet[i]] = i
}

export function encodeBase64(buffer: Uint8Array) {
	// for every 3 bytes, we need 4 base64 characters
	const result = new Uint8Array(Math.ceil(buffer.length / 3) * 4)
	for (let i = 0; i < buffer.length; i += 3) {
		const b1 = buffer[i]
		const b2 = buffer[i + 1] ?? 0
		const b3 = buffer[i + 2] ?? 0
		const index = i / 3
		result[index * 4] = alphabet[(b1 >> 2) & 0x3f]
		result[index * 4 + 1] = alphabet[((b1 << 4) & 0x30) | ((b2 >> 4) & 0x0f)]
		result[index * 4 + 2] = alphabet[((b2 << 2) & 0x3c) | ((b3 >> 6) & 0x03)]
		result[index * 4 + 3] = alphabet[b3 & 0x3f]
	}
	// add padding if needed
	if (buffer.length % 3 === 1) {
		result[result.length - 1] = equals
		result[result.length - 2] = equals
	} else if (buffer.length % 3 === 2) {
		result[result.length - 1] = equals
	}

	return String.fromCharCode.apply(null, result as any) // faster than TextEncoder
}

export function decodeBase64(base64: string): Uint8Array {
	// Remove padding and calculate output size
	const len = base64.length
	let padding = 0
	if (len > 0 && base64[len - 1] === '=') padding++
	if (len > 1 && base64[len - 2] === '=') padding++

	const outputLength = Math.floor((len * 3) / 4) - padding
	const result = new Uint8Array(outputLength)

	let outputIndex = 0
	for (let i = 0; i < len; i += 4) {
		// Get 4 base64 characters and convert to 6-bit values
		const c1 = decodeTable[base64.charCodeAt(i) & 0x7f] ?? 0
		const c2 = decodeTable[base64.charCodeAt(i + 1) & 0x7f] ?? 0
		const c3 = decodeTable[base64.charCodeAt(i + 2) & 0x7f] ?? 0
		const c4 = decodeTable[base64.charCodeAt(i + 3) & 0x7f] ?? 0

		// Convert 4 base64 characters (24 bits) to 3 bytes
		const byte1 = (c1 << 2) | (c2 >> 4)
		const byte2 = ((c2 & 0x0f) << 4) | (c3 >> 2)
		const byte3 = ((c3 & 0x03) << 6) | c4

		if (outputIndex < outputLength) result[outputIndex++] = byte1
		if (outputIndex < outputLength) result[outputIndex++] = byte2
		if (outputIndex < outputLength) result[outputIndex++] = byte3
	}

	return result
}

export async function decompressBase64JSON(base64: string) {
	const chunkSize = 1024 // must be a multiple of 4
	let offset = 0
	return await new Response(
		new ReadableStream({
			pull(controller) {
				const len = base64.length - offset
				if (len > chunkSize) {
					controller.enqueue(decodeBase64(base64.slice(offset, offset + chunkSize)))
					offset += chunkSize
				} else {
					if (len > 0) {
						controller.enqueue(decodeBase64(base64.slice(offset)))
					}
					controller.close()
				}
			},
		}).pipeThrough(new DecompressionStream('gzip'))
	).json()
}
