import { describe, expect, it } from 'vitest'
import { parseFileId } from './parseFileId'

describe('parseFileId', () => {
	it('accepts a bare file ID', () => {
		expect(parseFileId('  abc_DEF-123  ')).toBe('abc_DEF-123')
	})

	it('reads the ID from /f/ and /r/ links, with or without a scheme', () => {
		expect(parseFileId('https://www.tldraw.com/f/abc123')).toBe('abc123')
		expect(parseFileId('https://www.tldraw.com/f/abc123/history?d=v1.2.3.4')).toBe('abc123')
		expect(parseFileId('tldraw.com/r/legacyRoom')).toBe('legacyRoom')
	})

	it('rejects links whose slug is not a file ID', () => {
		expect(parseFileId('https://www.tldraw.com/p/publishedSlug')).toBeNull()
		expect(parseFileId('https://www.tldraw.com/ro/readonlySlug')).toBeNull()
		expect(parseFileId('https://www.tldraw.com/')).toBeNull()
	})

	it('rejects empty and malformed input', () => {
		expect(parseFileId('')).toBeNull()
		expect(parseFileId('not a file id')).toBeNull()
	})
})
