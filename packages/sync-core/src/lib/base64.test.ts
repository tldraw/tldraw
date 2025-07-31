import { Base64EncodeStream, decodeBase64, encodeBase64 } from './base64'

describe('encodeBase64', () => {
	test('encodes empty buffer', () => {
		const input = new Uint8Array(0)
		const result = encodeBase64(input)
		expect(result).toBe('')
	})

	test('encodes single byte', () => {
		const input = new Uint8Array([65]) // 'A'
		const result = encodeBase64(input)
		expect(result).toBe('QQ==')
		expect(btoa(String.fromCharCode(...input))).toBe('QQ==')
	})

	test('encodes two bytes', () => {
		const input = new Uint8Array([65, 66]) // 'AB'
		const result = encodeBase64(input)
		expect(result).toBe('QUI=')
		expect(btoa(String.fromCharCode(...input))).toBe('QUI=')
	})

	test('encodes three bytes', () => {
		const input = new Uint8Array([65, 66, 67]) // 'ABC'
		const result = encodeBase64(input)
		expect(result).toBe('QUJD')
		expect(btoa(String.fromCharCode(...input))).toBe('QUJD')
	})

	test('encodes four bytes', () => {
		const input = new Uint8Array([65, 66, 67, 68]) // 'ABCD'
		const result = encodeBase64(input)
		expect(result).toBe('QUJDRA==')
		expect(btoa(String.fromCharCode(...input))).toBe('QUJDRA==')
	})

	test('encodes five bytes', () => {
		const input = new Uint8Array([65, 66, 67, 68, 69]) // 'ABCDE'
		const result = encodeBase64(input)
		expect(result).toBe('QUJDREU=')
		expect(btoa(String.fromCharCode(...input))).toBe('QUJDREU=')
	})

	test('encodes six bytes', () => {
		const input = new Uint8Array([65, 66, 67, 68, 69, 70]) // 'ABCDEF'
		const result = encodeBase64(input)
		expect(result).toBe('QUJDREVG')
		expect(btoa(String.fromCharCode(...input))).toBe('QUJDREVG')
	})

	test('encodes random bytes', () => {
		const input = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
		const result = encodeBase64(input)
		const expected = btoa(String.fromCharCode(...input))
		expect(result).toBe(expected)
	})

	test('encodes large buffer', () => {
		const input = new Uint8Array(1000)
		for (let i = 0; i < input.length; i++) {
			input[i] = i % 256
		}
		const result = encodeBase64(input)
		const expected = btoa(String.fromCharCode(...input))
		expect(result).toBe(expected)
	})

	test('handles edge cases', () => {
		// Test with bytes that might cause issues
		const testCases = [
			new Uint8Array([0, 0, 0]),
			new Uint8Array([255, 255, 255]),
			new Uint8Array([0, 255, 0]),
			new Uint8Array([255, 0, 255]),
		]

		for (const input of testCases) {
			const result = encodeBase64(input)
			const expected = btoa(String.fromCharCode(...input))
			expect(result).toBe(expected)
		}
	})

	test('produces valid base64 that can be decoded', () => {
		const input = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
		const result = encodeBase64(input)

		// Should be able to decode it back
		const decoded = decodeBase64(result)
		expect([...decoded]).toEqual([...input])
	})
})

describe('decodeBase64', () => {
	test('decodes empty string', () => {
		const result = decodeBase64('')
		expect([...result]).toEqual([])
	})

	test('decodes single character', () => {
		const result = decodeBase64('QQ==') // 'A'
		expect([...result]).toEqual([65])
	})

	test('decodes two characters', () => {
		const result = decodeBase64('QUI=') // 'AB'
		expect([...result]).toEqual([65, 66])
	})

	test('decodes three characters', () => {
		const result = decodeBase64('QUJD') // 'ABC'
		expect([...result]).toEqual([65, 66, 67])
	})

	test('decodes four characters', () => {
		const result = decodeBase64('QUJDRA==') // 'ABCD'
		expect([...result]).toEqual([65, 66, 67, 68])
	})

	test('decodes five characters', () => {
		const result = decodeBase64('QUJDREU=') // 'ABCDE'
		expect([...result]).toEqual([65, 66, 67, 68, 69])
	})

	test('decodes six characters', () => {
		const result = decodeBase64('QUJDREVG') // 'ABCDEF'
		expect([...result]).toEqual([65, 66, 67, 68, 69, 70])
	})

	test('decodes random bytes', () => {
		const input = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
		const encoded = btoa(String.fromCharCode(...input))
		const result = decodeBase64(encoded)
		expect([...result]).toEqual([...input])
	})

	test('decodes large buffer', () => {
		const input = new Uint8Array(1000)
		for (let i = 0; i < input.length; i++) {
			input[i] = i % 256
		}
		const encoded = btoa(String.fromCharCode(...input))
		const result = decodeBase64(encoded)
		expect([...result]).toEqual([...input])
	})

	test('handles edge cases', () => {
		// Test with bytes that might cause issues
		const testCases = [
			new Uint8Array([0, 0, 0]),
			new Uint8Array([255, 255, 255]),
			new Uint8Array([0, 255, 0]),
			new Uint8Array([255, 0, 255]),
		]

		for (const input of testCases) {
			const encoded = btoa(String.fromCharCode(...input))
			const result = decodeBase64(encoded)
			expect([...result]).toEqual([...input])
		}
	})

	test('roundtrip with encodeBase64', () => {
		const input = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
		const encoded = encodeBase64(input)
		const decoded = decodeBase64(encoded)
		expect([...decoded]).toEqual([...input])
	})

	test('matches atob behavior', () => {
		const testCases = [
			'QQ==', // 'A'
			'QUI=', // 'AB'
			'QUJD', // 'ABC'
			'QUJDRA==', // 'ABCD'
			'QUJDREU=', // 'ABCDE'
			'QUJDREVG', // 'ABCDEF'
		]

		for (const base64 of testCases) {
			const ourResult = decodeBase64(base64)
			const atobResult = atob(base64)
			const atobBytes = new Uint8Array(atobResult.length)
			for (let i = 0; i < atobResult.length; i++) {
				atobBytes[i] = atobResult.charCodeAt(i)
			}
			expect([...ourResult]).toEqual([...atobBytes])
		}
	})
})

describe('Base64EncodeStream', () => {
	// Helper function to create a readable stream from data
	const createReadableStream = (data: Uint8Array | string | (Uint8Array | string)[]) => {
		return new ReadableStream({
			start(controller) {
				if (Array.isArray(data)) {
					for (const chunk of data) {
						controller.enqueue(chunk)
					}
				} else {
					controller.enqueue(data)
				}
				controller.close()
			},
		})
	}

	// Helper function to collect chunks from a writable stream
	const createChunkCollector = () => {
		const chunks: string[] = []
		const writable = new WritableStream({
			write(chunk) {
				chunks.push(chunk)
			},
		})
		return { chunks, writable }
	}

	// Helper function to run a stream test and return the encoded result
	const runStreamTest = async (input: Uint8Array | string | (Uint8Array | string)[]) => {
		const stream = new Base64EncodeStream()
		const readable = createReadableStream(input)
		const { chunks, writable } = createChunkCollector()

		await readable.pipeThrough(stream).pipeTo(writable)

		expect(chunks.length).toBeGreaterThan(0)

		// Combine all chunks into a single string
		return chunks.join('')
	}

	// Helper function to decode base64 and convert to Uint8Array
	const decodeBase64FromString = (encoded: string) => {
		const decoded = atob(encoded)
		const decodedBytes = new Uint8Array(decoded.length)
		for (let i = 0; i < decoded.length; i++) {
			decodedBytes[i] = decoded.charCodeAt(i)
		}
		return decodedBytes
	}

	test('stream using pipeTo', async () => {
		const inputString = 'ABC'
		const inputBytes = new TextEncoder().encode(inputString)
		const encoded = await runStreamTest(inputBytes)
		const decoded = decodeBase64FromString(encoded)
		expect([...decoded]).toEqual([...inputBytes])

		// Verify the encoded string is correct
		expect(encoded).toBe('QUJD')

		// Verify btoa produces the same result
		const btoaResult = btoa(inputString)
		expect(encoded).toBe(btoaResult)
	})

	test('handles empty input', async () => {
		const stream = new Base64EncodeStream()

		const readable = new ReadableStream({
			start(controller) {
				controller.close()
			},
		})

		const { chunks, writable } = createChunkCollector()

		await readable.pipeThrough(stream).pipeTo(writable)
		expect(chunks.length).toBe(0)
	})

	test('handles string input', async () => {
		const inputString = 'Hello'
		const encoded = await runStreamTest(inputString)
		const decoded = decodeBase64FromString(encoded)

		// Verify the decoded string is correct
		const decodedString = new TextDecoder().decode(decoded)
		expect(decodedString).toBe(inputString)

		// Verify btoa produces the same result
		const btoaResult = btoa(inputString)
		expect(encoded).toBe(btoaResult)
	})

	test('handles large input efficiently', async () => {
		// Create a large buffer that's NOT a multiple of 3 to test remaining bytes
		const largeBuffer = new Uint8Array(2000) // 2000 % 3 = 2, so 2 remaining bytes
		for (let i = 0; i < largeBuffer.length; i++) {
			largeBuffer[i] = i % 256
		}

		const encoded = await runStreamTest(largeBuffer)
		const decoded = decodeBase64FromString(encoded)
		expect([...decoded]).toEqual([...largeBuffer])

		// Verify btoa produces the same result
		const btoaResult = btoa(String.fromCharCode(...largeBuffer))
		expect(encoded).toBe(btoaResult)
	})

	test('handles padding correctly', async () => {
		const inputString = 'A'
		const inputBytes = new TextEncoder().encode(inputString)
		const encoded = await runStreamTest(inputBytes)
		expect(encoded).toBe('QQ==')

		const decoded = decodeBase64FromString(encoded)
		expect([...decoded]).toEqual([...inputBytes])

		// Verify btoa produces the same result
		const btoaResult = btoa(inputString)
		expect(encoded).toBe(btoaResult)
	})

	test('handles multiple chunks', async () => {
		const inputString = 'ABCDEF'
		const inputBytes = new TextEncoder().encode(inputString)
		const encoded = await runStreamTest([
			inputBytes.slice(0, 2), // 'AB'
			inputString.slice(2, 4), // 'CD'
			inputBytes.slice(4, 6), // 'EF'
		])
		const decoded = decodeBase64FromString(encoded)
		expect([...decoded]).toEqual([...inputBytes])

		// Verify btoa produces the same result
		const btoaResult = btoa(inputString)
		expect(encoded).toBe(btoaResult)
	})

	test('stream processes data in chunks during streaming', async () => {
		// Create a readable stream that enqueues data in chunks
		const readable = new ReadableStream({
			start(controller) {
				// First chunk - should not trigger output yet
				const chunk1 = new Uint8Array(600)
				for (let i = 0; i < chunk1.length; i++) {
					chunk1[i] = i % 256
				}
				controller.enqueue(chunk1)

				// Second chunk - should trigger output (1200 bytes total)
				const chunk2 = new Uint8Array(600)
				for (let i = 0; i < chunk2.length; i++) {
					chunk2[i] = (i + 600) % 256
				}
				controller.enqueue(chunk2)

				controller.close()
			},
		})

		const { chunks, writable } = createChunkCollector()
		const stream = new Base64EncodeStream()

		await readable.pipeThrough(stream).pipeTo(writable)

		expect(chunks.length).toBeGreaterThan(0)

		// Verify the encoded data can be decoded back
		const allEncoded = chunks.join('')

		const decoded = decodeBase64FromString(allEncoded)

		// Should match our original input exactly
		const expectedBytes = new Uint8Array(1200)
		for (let i = 0; i < expectedBytes.length; i++) {
			expectedBytes[i] = i % 256
		}
		expect([...decoded]).toEqual([...expectedBytes])

		// Verify btoa produces the same result
		const btoaResult = btoa(String.fromCharCode(...expectedBytes))
		expect(allEncoded).toBe(btoaResult)
	})

	test('handles input with 1 remaining byte', async () => {
		const inputString = 'ABCD'
		const inputBytes = new TextEncoder().encode(inputString)
		const encoded = await runStreamTest(inputBytes)
		expect(encoded).toBe('QUJDRA==') // 'ABCD' with 2 padding chars

		const decoded = decodeBase64FromString(encoded)
		expect([...decoded]).toEqual([...inputBytes])

		// Verify btoa produces the same result
		const btoaResult = btoa(inputString)
		expect(encoded).toBe(btoaResult)
	})

	test('handles input with 2 remaining bytes', async () => {
		const inputString = 'ABCDE'
		const inputBytes = new TextEncoder().encode(inputString)
		const encoded = await runStreamTest(inputBytes)
		expect(encoded).toBe('QUJDREU=') // 'ABCDE' with 1 padding char

		const decoded = decodeBase64FromString(encoded)
		expect([...decoded]).toEqual([...inputBytes])

		// Verify btoa produces the same result
		const btoaResult = btoa(inputString)
		expect(encoded).toBe(btoaResult)
	})

	test('handles large input with remaining bytes', async () => {
		// Create a large buffer that's NOT a multiple of 3 to test remaining bytes
		const largeBuffer = new Uint8Array(2000) // 2000 % 3 = 2, so 2 remaining bytes
		for (let i = 0; i < largeBuffer.length; i++) {
			largeBuffer[i] = i % 256
		}

		const encoded = await runStreamTest(largeBuffer)
		const decoded = decodeBase64FromString(encoded)

		// Should match our original input exactly
		expect([...decoded]).toEqual([...largeBuffer])

		// Verify btoa produces the same result
		const btoaResult = btoa(String.fromCharCode(...largeBuffer))
		expect(encoded).toBe(btoaResult)
	})
})
