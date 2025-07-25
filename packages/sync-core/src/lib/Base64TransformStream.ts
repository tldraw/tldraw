export class Base64TransformStream extends TransformStream {
	constructor() {
		let buffer = new Uint8Array(0)

		super({
			transform(chunk, controller) {
				// Convert chunk to Uint8Array if it's not already
				let uint8Chunk
				if (chunk instanceof Uint8Array) {
					uint8Chunk = chunk
				} else if (typeof chunk === 'string') {
					uint8Chunk = new TextEncoder().encode(chunk)
				} else if (chunk instanceof ArrayBuffer) {
					uint8Chunk = new Uint8Array(chunk)
				} else {
					throw new TypeError('Chunk must be a string, Uint8Array, or ArrayBuffer')
				}

				// Combine buffer with new chunk
				const combined = new Uint8Array(buffer.length + uint8Chunk.length)
				combined.set(buffer)
				combined.set(uint8Chunk, buffer.length)

				// Process in groups of 3 bytes (which encode to 4 base64 characters)
				const completeGroups = Math.floor(combined.length / 3)
				const processedBytes = completeGroups * 3

				if (processedBytes > 0) {
					const toEncode = combined.slice(0, processedBytes)
					const base64 = btoa(String.fromCharCode(...toEncode))
					controller.enqueue(base64)
				}

				// Keep remaining bytes for next chunk
				buffer = combined.slice(processedBytes)
			},

			flush(controller) {
				// Handle any remaining bytes with padding
				if (buffer.length > 0) {
					const base64 = btoa(String.fromCharCode(...buffer))
					controller.enqueue(base64)
				}
			},
		})
	}
}
