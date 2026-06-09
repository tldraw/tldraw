import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import { readTarStream, type TarEntry } from './tarStreamReader'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = join(__dirname, 'tarStreamReader-fixtures')

function loadFixture(name: string): Uint8Array {
	return new Uint8Array(readFileSync(join(FIXTURES_DIR, `${name}.tar`)))
}

function streamFromBytes(bytes: Uint8Array, chunkSizes?: number[]): ReadableStream<Uint8Array> {
	if (chunkSizes?.length) {
		let offset = 0
		return new ReadableStream({
			pull(controller) {
				const size = chunkSizes.shift() ?? Math.min(1024, bytes.length - offset)
				if (offset >= bytes.length) {
					controller.close()
					return
				}
				const end = Math.min(offset + size, bytes.length)
				controller.enqueue(bytes.subarray(offset, end))
				offset = end
				if (offset >= bytes.length) controller.close()
			},
		})
	}
	return new ReadableStream({
		start(c) {
			c.enqueue(bytes)
			c.close()
		},
	})
}

async function collectEntries(stream: ReadableStream<Uint8Array>): Promise<TarEntry[]> {
	const entries: TarEntry[] = []
	for await (const entry of readTarStream(stream)) {
		entries.push(entry)
	}
	return entries
}

describe('readTarStream', () => {
	test('reads single-file.tar (one file, body "hello")', async () => {
		const bytes = loadFixture('single-file')
		const entries = await collectEntries(streamFromBytes(bytes))
		expect(entries).toHaveLength(1)
		expect(entries[0].name).toBe('a.txt')
		expect(entries[0].size).toBe(5)
		expect(new TextDecoder().decode(entries[0].body)).toBe('hello')
	})

	test('reads with-prefix.tar (path/to/file.json with body "content")', async () => {
		const bytes = loadFixture('with-prefix')
		const entries = await collectEntries(streamFromBytes(bytes))
		const file = entries.find((e) => e.name === 'path/to/file.json')
		expect(file).toBeDefined()
		expect(new TextDecoder().decode(file!.body)).toBe('content')
	})

	test('reads directory-only.tar (records/ directory, no body)', async () => {
		const bytes = loadFixture('directory-only')
		const entries = await collectEntries(streamFromBytes(bytes))
		expect(entries).toHaveLength(1)
		expect(entries[0].name).toMatch(/^records\/?$/)
		expect(entries[0].body.length).toBe(0)
	})

	test('reads multi-file.tar (meta.json, records/, records/doc1.json)', async () => {
		const bytes = loadFixture('multi-file')
		const entries = await collectEntries(streamFromBytes(bytes))
		expect(entries.length).toBeGreaterThanOrEqual(3)
		const meta = entries.find((e) => e.name === 'meta.json')
		const doc = entries.find((e) => e.name === 'records/doc1.json')
		expect(meta).toBeDefined()
		expect(new TextDecoder().decode(meta!.body)).toBe('{}')
		expect(doc).toBeDefined()
		expect(new TextDecoder().decode(doc!.body)).toBe('{"id":"1"}')
	})

	test('handles chunked stream (single-file.tar in small chunks)', async () => {
		const bytes = loadFixture('single-file')
		const stream = streamFromBytes(bytes, [100, 200, 512, 300, 512])
		const entries = await collectEntries(stream)
		expect(entries).toHaveLength(1)
		expect(new TextDecoder().decode(entries[0].body)).toBe('hello')
	})

	test('reads large-body.tar (600-byte file)', async () => {
		const bytes = loadFixture('large-body')
		const entries = await collectEntries(streamFromBytes(bytes))
		expect(entries).toHaveLength(1)
		expect(entries[0].name).toBe('big.bin')
		expect(entries[0].body.length).toBe(600)
		expect(entries[0].body.every((b) => b === 0x61)).toBe(true)
	})
})
