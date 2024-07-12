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
		expect(unchunker.handleMessage(chunks[chunks.length - 1])).toEqual({ data: testObject })

		// and the next one should be fine
		expect(unchunker.handleMessage('{"ok": true}')).toEqual({ data: { ok: true } })
	})

	// todo: test error cases
	it('returns an error if the json is whack', () => {
		const chunks = chunk('{"hello": world"}', 5)
		const unchunker = new JsonChunkAssembler()
		for (const chunk of chunks.slice(0, -1)) {
			const result = unchunker.handleMessage(chunk)
			expect(result).toBeNull()
		}

		const node18Error = `Unexpected token w in JSON at position 10`
		const node20Error = `Unexpected token 'w', "\\{"hello": world"}" is not valid JSON`
		expect(unchunker.handleMessage(chunks[chunks.length - 1])?.error?.message).toMatch(
			new RegExp(`${node18Error}|${node20Error}`)
		)

		// and the next one should be fine
		expect(unchunker.handleMessage('{"ok": true}')).toEqual({ data: { ok: true } })
	})
	it('returns an error if one of the chunks was missing', () => {
		const chunks = chunk('{"hello": world"}', 10)
		expect(chunks).toHaveLength(3)

		const unchunker = new JsonChunkAssembler()
		expect(unchunker.handleMessage(chunks[0])).toBeNull()
		expect(unchunker.handleMessage(chunks[2])?.error?.message).toMatchInlineSnapshot(
			`"Chunks received in wrong order"`
		)

		// and the next one should be fine
		expect(unchunker.handleMessage('{"ok": true}')).toEqual({ data: { ok: true } })
	})

	it('returns an error if the chunk stream ends abruptly', () => {
		const chunks = chunk('{"hello": world"}', 10)
		expect(chunks).toHaveLength(3)

		const unchunker = new JsonChunkAssembler()
		expect(unchunker.handleMessage(chunks[0])).toBeNull()
		expect(unchunker.handleMessage(chunks[1])).toBeNull()

		// it should still return the data for the next message
		// even if there was an unexpected end to the chunks stream
		const res = unchunker.handleMessage('{"hello": "world"}')
		expect(res?.data).toEqual({ hello: 'world' })
		expect(res?.error?.message).toMatchInlineSnapshot(`"Unexpected non-chunk message"`)

		// and the next one should be fine
		expect(unchunker.handleMessage('{"ok": true}')).toEqual({ data: { ok: true } })
	})

	it('returns an error if the chunk syntax is wrong', () => {
		// it only likes json objects
		const unchunker = new JsonChunkAssembler()
		expect(unchunker.handleMessage('["yo"]')?.error?.message).toMatchInlineSnapshot(
			`"Invalid chunk: "[\\"yo\\"]...""`
		)

		// and the next one should be fine
		expect(unchunker.handleMessage('{"ok": true}')).toEqual({ data: { ok: true } })
	})
})
