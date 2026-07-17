import { assert } from 'tldraw'
import { JsonChunkAssembler, chunk } from './chunk'

describe('chunk (CH1–CH3)', () => {
	describe('size boundary (CH1)', () => {
		it('[CH1] returns the message as a single chunk when its length is strictly less than maxSize', () => {
			expect(chunk('hello', 100)).toEqual(['hello'])
			expect(chunk('x'.repeat(9), 10)).toEqual(['x'.repeat(9)])
		})

		it('[CH1] chunks a message whose length equals maxSize', () => {
			const msg = 'x'.repeat(10)
			const result = chunk(msg, 10)
			expect(result.length).toBeGreaterThan(1)
			expect(result[0]).toMatch(/^\d+_x+$/)
		})

		it('[CH1] handles empty strings', () => {
			expect(chunk('', 100)).toEqual([''])
		})

		it('[CH1] handles single character strings', () => {
			expect(chunk('a', 100)).toEqual(['a'])
		})

		it('[CH1] uses the default max size when none is provided', () => {
			const longString = 'x'.repeat(262145) // larger than the 262144 default
			const result = chunk(longString)
			expect(result.length).toBeGreaterThan(1)
			expect(result[0]).toMatch(/^\d+_x+$/)
		})
	})

	describe('chunk format and ordering (CH2)', () => {
		it('[CH2] prefixes chunks with a countdown and puts the start of the message first', () => {
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

		it('[CH2] concatenating the chunk bodies in order reconstructs the message', () => {
			const original = 'hello world this is a long message'
			const reconstructed = chunk(original, 8)
				.map((c) => /^(\d+)_(.*)$/s.exec(c)![2])
				.join('')
			expect(reconstructed).toEqual(original)
		})

		it('[CH2] preserves unicode characters across chunk boundaries', () => {
			const unicodeString = '🎨'.repeat(10) + '📐'.repeat(10) + '🗼️'.repeat(10)
			const result = chunk(unicodeString, 20)
			expect(result.length).toBeGreaterThan(1)

			const reconstructed = result.map((c) => /^(\d+)_(.*)$/s.exec(c)![2]).join('')
			expect(reconstructed).toEqual(unicodeString)
		})

		it('[CH2] reconstructs very large strings', () => {
			const veryLargeString = 'a'.repeat(1000000) // 1MB string
			const result = chunk(veryLargeString, 10000)
			expect(result.length).toBeGreaterThan(1)

			const reconstructed = result.map((c) => /^(\d+)_(.*)$/s.exec(c)![2]).join('')
			expect(reconstructed).toEqual(veryLargeString)
		})
	})

	describe('chunk size limits (CH3)', () => {
		it('[CH3] keeps each chunk at or below maxSize', () => {
			const maxSize = 15
			for (const c of chunk('hello world this is a long message', maxSize)) {
				expect(c.length).toBeLessThanOrEqual(maxSize)
			}

			expect(chunk('dark and stormy tonight', 4)).toMatchInlineSnapshot(`
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

		it('[CH3] carries at least one content character per chunk even when the prefix alone exceeds maxSize', () => {
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
})

const testObject = {} as any
for (let i = 0; i < 1000; i++) {
	testObject['key_' + i] = 'value_' + i
}

describe('JsonChunkAssembler (CH4–CH8)', () => {
	describe('whole JSON messages while idle (CH4)', () => {
		it('[CH4] parses a message starting with { immediately and returns data and stringified', () => {
			const unchunker = new JsonChunkAssembler()
			expect(unchunker.handleMessage('{"key": "value"}')).toMatchObject({
				data: { key: 'value' },
				stringified: '{"key": "value"}',
			})
		})

		it('[CH4] handles an empty JSON object', () => {
			const unchunker = new JsonChunkAssembler()
			expect(unchunker.handleMessage('{}')).toMatchObject({ data: {}, stringified: '{}' })
		})

		it('[CH4] throws synchronously on invalid JSON starting with {', () => {
			const unchunker = new JsonChunkAssembler()
			expect(() => unchunker.handleMessage('{not valid json')).toThrow()

			// the assembler is still usable afterwards
			expect(unchunker.handleMessage('{"ok": true}')).toMatchObject({ data: { ok: true } })
		})
	})

	describe('JSON messages mid-sequence (CH5)', () => {
		it('[CH5] returns an error when a { message interrupts a chunk sequence and resets to idle', () => {
			const unchunker = new JsonChunkAssembler()

			// start a chunk sequence
			expect(unchunker.handleMessage('2_hello')).toBeNull()

			// interrupt with a JSON message: both the partial sequence and this
			// message are discarded
			const result = unchunker.handleMessage('{"interrupt": true}')
			assert(result && 'error' in result, 'expected error result')
			expect(result.error.message).toBe('Unexpected non-chunk message')

			// the assembler reset to idle, so the next message works
			expect(unchunker.handleMessage('{"ok": true}')).toMatchObject({ data: { ok: true } })
		})

		it('[CH5] returns an error when the chunk stream ends abruptly', () => {
			const chunks = chunk('{"hello": world"}', 10)

			const unchunker = new JsonChunkAssembler()
			expect(unchunker.handleMessage(chunks[0])).toBeNull()
			expect(unchunker.handleMessage(chunks[1])).toBeNull()

			const res = unchunker.handleMessage('{"hello": "world"}')
			assert(res, 'expected a result')
			assert('error' in res, 'expected an error')
			expect(res.error.message).toBe('Unexpected non-chunk message')

			// and the next one should be fine
			expect(unchunker.handleMessage('{"ok": true}')).toMatchObject({ data: { ok: true } })
		})
	})

	describe('chunk accumulation (CH6)', () => {
		it.each([1, 5, 20, 200])(
			'[CH6] returns null until the final chunk, then the parsed json (split at %s bytes)',
			(size) => {
				const chunks = chunk(JSON.stringify(testObject), size)

				const unchunker = new JsonChunkAssembler()
				for (const c of chunks.slice(0, -1)) {
					expect(unchunker.handleMessage(c)).toBeNull()
				}
				expect(unchunker.handleMessage(chunks[chunks.length - 1])).toMatchObject({
					data: testObject,
				})

				// resets to idle: the next one should be fine
				expect(unchunker.handleMessage('{"ok": true}')).toMatchObject({ data: { ok: true } })
			}
		)

		it('[CH6] handles complex nested JSON objects', () => {
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

			for (const c of chunks.slice(0, -1)) {
				expect(unchunker.handleMessage(c)).toBeNull()
			}

			expect(unchunker.handleMessage(chunks[chunks.length - 1])).toMatchObject({
				data: complexObject,
			})
		})

		it('[CH6] handles a single chunk with a 0_ prefix', () => {
			const unchunker = new JsonChunkAssembler()
			expect(unchunker.handleMessage('0_{"single": "chunk"}')).toMatchObject({
				data: { single: 'chunk' },
				stringified: '{"single": "chunk"}',
			})
		})

		it('[CH6] handles chunks with empty data parts', () => {
			const unchunker = new JsonChunkAssembler()

			expect(unchunker.handleMessage('1_')).toBeNull() // empty first chunk
			expect(unchunker.handleMessage('0_{"test": true}')).toMatchObject({ data: { test: true } })
		})

		it('[CH6] returns an error when the assembled json is invalid, then resets to idle', () => {
			const chunks = chunk('{"hello": world"}', 5)
			const unchunker = new JsonChunkAssembler()
			for (const c of chunks.slice(0, -1)) {
				expect(unchunker.handleMessage(c)).toBeNull()
			}

			const node18Error = `Unexpected token w in JSON at position 10`
			const node20Error = `Unexpected token 'w', "\\{"hello": world"}" is not valid JSON`
			const res = unchunker.handleMessage(chunks[chunks.length - 1])
			assert(res, 'expected a result')
			assert('error' in res, 'expected an error')
			expect(res.error.message).toMatch(new RegExp(`${node18Error}|${node20Error}`))

			// and the next one should be fine
			expect(unchunker.handleMessage('{"ok": true}')).toMatchObject({ data: { ok: true } })
		})

		it('[CH6] returns an error object when chunks form invalid json', () => {
			const unchunker = new JsonChunkAssembler()

			expect(unchunker.handleMessage('1_{"invalid":')).toBeNull()
			const result = unchunker.handleMessage('0_ }')

			assert(result && 'error' in result, 'expected error result')
			expect(result.error).toBeInstanceOf(Error)
		})
	})

	describe('malformed chunk sequences (CH7)', () => {
		it('[CH7] returns an error when a chunk is missing from the sequence, then resets to idle', () => {
			const chunks = chunk('{"hello": world"}', 10)

			const unchunker = new JsonChunkAssembler()
			expect(unchunker.handleMessage(chunks[0])).toBeNull()
			const res = unchunker.handleMessage(chunks[2])
			assert(res, 'expected a result')
			assert('error' in res, 'expected an error')
			expect(res.error.message).toBe('Chunks received in wrong order')

			// and the next one should be fine
			expect(unchunker.handleMessage('{"ok": true}')).toMatchObject({ data: { ok: true } })
		})

		it('[CH7] returns an error for duplicate or out-of-order chunk numbers', () => {
			const unchunker = new JsonChunkAssembler()

			expect(unchunker.handleMessage('2_part1')).toBeNull()

			// the countdown should be 1 here, not 0
			const result = unchunker.handleMessage('0_part3')
			assert(result && 'error' in result, 'expected error result')
			expect(result.error.message).toBe('Chunks received in wrong order')
		})

		it('[CH7] returns an invalid chunk error for non-json, non-chunk messages', () => {
			const unchunker = new JsonChunkAssembler()
			const res = unchunker.handleMessage('["yo"]')
			assert(res, 'expected a result')
			assert('error' in res, 'expected an error')
			expect(res.error.message).toContain('Invalid chunk')

			// and the next one should be fine
			expect(unchunker.handleMessage('{"ok": true}')).toMatchObject({ data: { ok: true } })
		})

		it('[CH7] returns an invalid chunk error for a malformed chunk number', () => {
			const unchunker = new JsonChunkAssembler()
			const result = unchunker.handleMessage('abc_invalid_number')
			assert(result && 'error' in result, 'expected error result')
			expect(result.error.message).toContain('Invalid chunk')
		})

		it('[CH7] resets to idle after an invalid chunk mid-sequence', () => {
			const unchunker = new JsonChunkAssembler()

			// start a chunk sequence
			expect(unchunker.handleMessage('1_hello')).toBeNull()

			// send a malformed chunk to trigger the error
			const result = unchunker.handleMessage('invalid_chunk_format')
			assert(result && 'error' in result, 'expected error result')
			expect(result.error.message).toContain('Invalid chunk')

			// normal messages work again
			expect(unchunker.handleMessage('{"test": true}')).toMatchObject({ data: { test: true } })
		})
	})

	describe('chunk body contents (CH8)', () => {
		it('[CH8] handles unicode line separators U+2028 and U+2029 in chunks', () => {
			// These characters are common when copy/pasting from Microsoft Word
			// and are valid JSON string content but act as line terminators in JS
			const unchunker = new JsonChunkAssembler()

			const jsonWithLineSeparators = '{"text": "hello\u2028world\u2029end"}'
			const chunks = chunk(jsonWithLineSeparators, 10)

			for (const c of chunks.slice(0, -1)) {
				expect(unchunker.handleMessage(c)).toBeNull()
			}

			expect(unchunker.handleMessage(chunks[chunks.length - 1])).toMatchObject({
				data: { text: 'hello\u2028world\u2029end' },
			})
		})
	})
})
