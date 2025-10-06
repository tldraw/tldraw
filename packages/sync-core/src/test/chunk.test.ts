import { assert } from 'tldraw'
import { describe, expect, it } from 'vitest'
import { JsonChunkAssembler, chunk } from '../lib/chunk'

describe('chunk', () => {
	it('chunks a string', () => {
		expect(chunk('hello there my good world', 5)).toMatchInlineSnapshot(`
		[
		  "8_h",
		  "7_ell",
		  "6_o t",
		  "5_her",
		  "4_e m",
		  "3_y g",
		  "2_ood",
		  "1_ wo",
		  "0_rld",
		]
	`)

		expect(chunk('hello there my good world', 10)).toMatchInlineSnapshot(`
		[
		  "3_h",
		  "2_ello the",
		  "1_re my go",
		  "0_od world",
		]
	`)
	})

	it('does not chunk the string if it is small enough', () => {
		const chunks = chunk('hello', 100)
		expect(chunks).toMatchInlineSnapshot(`
		[
		  "hello",
		]
	`)
	})

	it('makes sure the chunk length does not exceed the given message size', () => {
		const chunks = chunk('dark and stormy tonight', 4)
		expect(chunks).toMatchInlineSnapshot(`
		[
		  "12_d",
		  "11_a",
		  "10_r",
		  "9_k ",
		  "8_an",
		  "7_d ",
		  "6_st",
		  "5_or",
		  "4_my",
		  "3_ t",
		  "2_on",
		  "1_ig",
		  "0_ht",
		]
	`)
	})

	it('does its best if the chunk size is too small', () => {
		const chunks = chunk('once upon a time', 1)
		expect(chunks).toMatchInlineSnapshot(`
		[
		  "15_o",
		  "14_n",
		  "13_c",
		  "12_e",
		  "11_ ",
		  "10_u",
		  "9_p",
		  "8_o",
		  "7_n",
		  "6_ ",
		  "5_a",
		  "4_ ",
		  "3_t",
		  "2_i",
		  "1_m",
		  "0_e",
		]
	`)
	})
})

const testObject = {} as any
for (let i = 0; i < 1000; i++) {
	testObject['key_' + i] = 'value_' + i
}

describe('json unchunker', () => {
	it.each([1, 5, 20, 200])('unchunks a json string split at %s bytes', (size) => {
		const chunks = chunk(JSON.stringify(testObject), size)

		const unchunker = new JsonChunkAssembler()
		for (const chunk of chunks.slice(0, -1)) {
			const result = unchunker.handleMessage(chunk)
			expect(result).toBeNull()
		}
		expect(unchunker.handleMessage(chunks[chunks.length - 1])).toMatchObject({ data: testObject })

		// and the next one should be fine
		expect(unchunker.handleMessage('{"ok": true}')).toMatchObject({ data: { ok: true } })
	})

	it('returns an error if the json is whack', () => {
		const chunks = chunk('{"hello": world"}', 5)
		const unchunker = new JsonChunkAssembler()
		for (const chunk of chunks.slice(0, -1)) {
			const result = unchunker.handleMessage(chunk)
			expect(result).toBeNull()
		}

		const node18Error = `Unexpected token w in JSON at position 10`
		const node20Error = `Unexpected token 'w', "\\{"hello": world"}" is not valid JSON`
		const res = unchunker.handleMessage(chunks[chunks.length - 1])
		assert(res, 'expected a result')
		assert('error' in res, 'expected an error')
		expect(res.error?.message).toMatch(new RegExp(`${node18Error}|${node20Error}`))

		// and the next one should be fine
		expect(unchunker.handleMessage('{"ok": true}')).toMatchObject({ data: { ok: true } })
	})
	it('returns an error if one of the chunks was missing', () => {
		const chunks = chunk('{"hello": world"}', 10)

		const unchunker = new JsonChunkAssembler()
		expect(unchunker.handleMessage(chunks[0])).toBeNull()
		const res = unchunker.handleMessage(chunks[2])
		assert(res, 'expected a result')
		assert('error' in res, 'expected an error')
		expect(res.error?.message).toMatchInlineSnapshot(`"Chunks received in wrong order"`)

		// and the next one should be fine
		expect(unchunker.handleMessage('{"ok": true}')).toMatchObject({ data: { ok: true } })
	})

	it('returns an error if the chunk stream ends abruptly', () => {
		const chunks = chunk('{"hello": world"}', 10)

		const unchunker = new JsonChunkAssembler()
		expect(unchunker.handleMessage(chunks[0])).toBeNull()
		expect(unchunker.handleMessage(chunks[1])).toBeNull()

		const res = unchunker.handleMessage('{"hello": "world"}')
		assert(res, 'expected a result')
		assert('error' in res, 'expected an error')

		expect(res?.error?.message).toMatchInlineSnapshot(`"Unexpected non-chunk message"`)

		// and the next one should be fine
		expect(unchunker.handleMessage('{"ok": true}')).toMatchObject({ data: { ok: true } })
	})

	it('returns an error if the chunk syntax is wrong', () => {
		// it only likes json objects
		const unchunker = new JsonChunkAssembler()
		const res = unchunker.handleMessage('["yo"]')
		assert(res, 'expected a result')
		assert('error' in res, 'expected an error')

		expect(res.error?.message).toMatchInlineSnapshot(`"Invalid chunk: "[\\"yo\\"]...""`)

		// and the next one should be fine
		expect(unchunker.handleMessage('{"ok": true}')).toMatchObject({ data: { ok: true } })
	})

	it('handles empty string', () => {
		const unchunker = new JsonChunkAssembler()
		const result = unchunker.handleMessage('{}')
		expect(result).toMatchObject({ data: {}, stringified: '{}' })
	})

	it('handles complex nested JSON objects', () => {
		const complexObject = {
			array: [1, 2, { nested: true }],
			null: null,
			boolean: false,
			number: 3.14,
			string: 'hello world',
			unicode: '🎨🗼️📐',
			deep: {
				nested: {
					object: {
						with: 'many levels',
					},
				},
			},
		}

		const chunks = chunk(JSON.stringify(complexObject), 50)
		const unchunker = new JsonChunkAssembler()

		for (const chunk of chunks.slice(0, -1)) {
			expect(unchunker.handleMessage(chunk)).toBeNull()
		}

		const result = unchunker.handleMessage(chunks[chunks.length - 1])
		expect(result).toMatchObject({ data: complexObject })
	})

	it('handles state reset after error', () => {
		const unchunker = new JsonChunkAssembler()

		// Start a chunk sequence
		expect(unchunker.handleMessage('1_hello')).toBeNull()

		// Send malformed chunk to trigger error
		const result = unchunker.handleMessage('invalid_chunk_format')
		assert(result && 'error' in result, 'expected error result')
		expect(result.error.message).toContain('Invalid chunk')

		// Should be able to process normal messages again
		expect(unchunker.handleMessage('{"test": true}')).toMatchObject({ data: { test: true } })
	})

	it('returns error for invalid chunk number format', () => {
		const unchunker = new JsonChunkAssembler()
		const result = unchunker.handleMessage('abc_invalid_number')
		assert(result && 'error' in result, 'expected error result')
		expect(result.error.message).toContain('Invalid chunk')
	})

	it('handles single chunk with number prefix correctly', () => {
		const unchunker = new JsonChunkAssembler()
		const result = unchunker.handleMessage('0_{"single": "chunk"}')
		expect(result).toMatchObject({
			data: { single: 'chunk' },
			stringified: '{"single": "chunk"}',
		})
	})

	it('handles chunks with empty data parts', () => {
		const unchunker = new JsonChunkAssembler()

		expect(unchunker.handleMessage('1_')).toBeNull() // empty first chunk
		const result = unchunker.handleMessage('0_{"test": true}')
		expect(result).toMatchObject({ data: { test: true } })
	})

	it('handles non-JSON string messages that are not chunks', () => {
		const unchunker = new JsonChunkAssembler()
		const result = unchunker.handleMessage('not_json_and_not_chunk')
		assert(result && 'error' in result, 'expected error result')
		expect(result.error.message).toContain('Invalid chunk')
	})

	it('handles chunk sequence interrupted by JSON message', () => {
		const unchunker = new JsonChunkAssembler()

		// Start chunk sequence
		expect(unchunker.handleMessage('2_hello')).toBeNull()

		// Interrupt with JSON message - should trigger error and reset state
		const result = unchunker.handleMessage('{"interrupt": true}')
		assert(result && 'error' in result, 'expected error result')
		expect(result.error.message).toBe('Unexpected non-chunk message')

		// Should be able to process messages normally again
		expect(unchunker.handleMessage('{"ok": true}')).toMatchObject({ data: { ok: true } })
	})

	it('handles duplicate or out-of-order chunk numbers', () => {
		const unchunker = new JsonChunkAssembler()

		// Start with first chunk
		expect(unchunker.handleMessage('2_part1')).toBeNull()

		// Send chunk with wrong number (should be 1, not 0)
		const result = unchunker.handleMessage('0_part3')
		assert(result && 'error' in result, 'expected error result')
		expect(result.error.message).toBe('Chunks received in wrong order')
	})

	it('handles JSON parse error in completed chunk sequence', () => {
		const unchunker = new JsonChunkAssembler()

		// Send chunks that form invalid JSON when combined
		expect(unchunker.handleMessage('1_{"invalid":')).toBeNull()
		const result = unchunker.handleMessage('0_ }')

		assert(result && 'error' in result, 'expected error result')
		expect(result.error).toBeInstanceOf(Error)
	})
})

describe('chunk function edge cases', () => {
	it('handles empty strings', () => {
		const result = chunk('', 100)
		expect(result).toEqual([''])
	})

	it('handles single character strings', () => {
		const result = chunk('a', 100)
		expect(result).toEqual(['a'])
	})

	it('uses default maxSafeMessageSize when not provided', () => {
		// Create a string longer than default max size to test chunking
		const longString = 'x'.repeat(262145) // Larger than 262144 default
		const result = chunk(longString)

		expect(result.length).toBeGreaterThan(1)
		expect(result[0]).toMatch(/^\d+_x+$/)
	})

	it('handles strings exactly at the boundary', () => {
		const boundaryString = 'x'.repeat(9) // 9 chars fits in 10 char limit
		const result = chunk(boundaryString, 10)

		expect(result).toEqual([boundaryString])
	})

	it('handles strings one character over the boundary', () => {
		const overBoundaryString = 'x'.repeat(11)
		const result = chunk(overBoundaryString, 10)

		expect(result.length).toBeGreaterThan(1)
		expect(result[0]).toMatch(/^\d+_x+$/)
	})

	it('preserves unicode characters correctly', () => {
		const unicodeString = '🎨'.repeat(10) + '📐'.repeat(10) + '🗼️'.repeat(10)
		const result = chunk(unicodeString, 20)

		// Verify chunking works with unicode
		expect(result.length).toBeGreaterThan(1)

		// Reconstruct and verify
		const reconstructed = result
			.map((chunk) => {
				const match = /^(\d+)_(.*)$/.exec(chunk)
				return match ? match[2] : chunk
			})
			.join('')

		expect(reconstructed).toEqual(unicodeString)
	})

	it('ensures no chunk exceeds maxSafeMessageSize', () => {
		const maxSize = 15
		const testString = 'hello world this is a long message'
		const result = chunk(testString, maxSize)

		for (const chunk of result) {
			expect(chunk.length).toBeLessThanOrEqual(maxSize)
		}
	})

	it('handles very large strings efficiently', () => {
		const veryLargeString = 'a'.repeat(1000000) // 1MB string
		const result = chunk(veryLargeString, 10000)

		expect(result.length).toBeGreaterThan(1)

		// Verify reconstruction works
		const reconstructed = result
			.map((chunk) => {
				const match = /^(\d+)_(.*)$/.exec(chunk)
				return match ? match[2] : chunk
			})
			.join('')

		expect(reconstructed).toEqual(veryLargeString)
	})
})
