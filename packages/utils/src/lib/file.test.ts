import { describe, expect, it } from 'vitest'
import { FileHelpers } from './file'

describe('FileHelpers', () => {
	describe('urlToDataUrl', () => {
		it('should return data URL unchanged if already a data URL', async () => {
			const dataUrl = 'data:text/plain;base64,SGVsbG8gV29ybGQ='
			const result = await FileHelpers.urlToDataUrl(dataUrl)

			expect(result).toBe(dataUrl)
		})
	})

	describe('rewriteMimeType', () => {
		it('should return the same blob if MIME type matches', () => {
			const blob = new Blob(['content'], { type: 'text/plain' })
			const result = FileHelpers.rewriteMimeType(blob, 'text/plain')

			expect(result).toBe(blob)
		})

		it('should create new blob with different MIME type', () => {
			const blob = new Blob(['content'], { type: 'text/plain' })
			const result = FileHelpers.rewriteMimeType(blob, 'application/json')

			expect(result).not.toBe(blob)
			expect(result.type).toBe('application/json')
			expect(result.size).toBe(blob.size)
		})

		it('should return the same file if MIME type matches', () => {
			const file = new File(['content'], 'test.txt', { type: 'text/plain' })
			const result = FileHelpers.rewriteMimeType(file, 'text/plain')

			expect(result).toBe(file)
		})

		it('should create new file with different MIME type and preserve name', () => {
			const file = new File(['content'], 'test.txt', { type: 'text/plain' })
			const result = FileHelpers.rewriteMimeType(file, 'application/json') as File

			expect(result).not.toBe(file)
			expect(result.type).toBe('application/json')
			expect(result.name).toBe('test.txt')
			expect(result.size).toBe(file.size)
			expect(result).toBeInstanceOf(File)
		})
	})
})
