import { describe, expect, it } from 'vitest'
import { formatFileVersionSource, parseCreateSource } from './createSource'

describe('parseCreateSource', () => {
	it('parses f/<id>', () => {
		expect(parseCreateSource('f/file_abc')).toEqual({
			prefix: 'f',
			id: 'file_abc',
			versionTs: null,
		})
	})

	it('parses f/<id>@<iso>', () => {
		expect(parseCreateSource('f/file_abc@2026-10-01T00:00:00.000Z')).toEqual({
			prefix: 'f',
			id: 'file_abc',
			versionTs: '2026-10-01T00:00:00.000Z',
		})
	})

	it('rejects 3 slash parts', () => {
		expect(parseCreateSource('f/a/b')).toBeNull()
	})

	it('format round-trips', () => {
		expect(
			parseCreateSource(formatFileVersionSource('file_abc', '2026-10-01T00:00:00.000Z'))
		).toEqual({ prefix: 'f', id: 'file_abc', versionTs: '2026-10-01T00:00:00.000Z' })
	})
})
