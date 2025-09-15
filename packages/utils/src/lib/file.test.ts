import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FileHelpers } from './file'
import * as networkModule from './network'

// Mock the network module
vi.mock('./network', () => ({
	fetch: vi.fn(),
}))

// Mock FileReader API
class MockFileReader {
	result: string | ArrayBuffer | null = null
	onload: ((event: ProgressEvent<FileReader>) => void) | null = null
	onerror: ((event: ProgressEvent<FileReader>) => void) | null = null
	onabort: ((event: ProgressEvent<FileReader>) => void) | null = null

	readAsDataURL(blob: Blob) {
		// Simulate async behavior
		setTimeout(() => {
			if (blob.type === 'text/plain') {
				this.result = 'data:text/plain;base64,SGVsbG8gV29ybGQ='
			} else if (blob.type === 'image/png') {
				this.result =
					'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGBGBgAAAABJRU5ErkJggg=='
			} else {
				this.result = 'data:application/octet-stream;base64,SGVsbG8gV29ybGQ='
			}
			this.onload?.(new ProgressEvent('load') as any)
		}, 0)
	}

	readAsText(blob: Blob) {
		setTimeout(() => {
			// Convert blob content to text
			if (blob.size === 0) {
				this.result = ''
			} else {
				this.result = 'Hello World' // Mock text content
			}
			this.onload?.(new ProgressEvent('load') as any)
		}, 0)
	}

	simulateError() {
		setTimeout(() => {
			this.onerror?.(new ProgressEvent('error') as any)
		}, 0)
	}

	simulateAbort() {
		setTimeout(() => {
			this.onabort?.(new ProgressEvent('abort') as any)
		}, 0)
	}
}

// Mock global FileReader
global.FileReader = MockFileReader as any

describe('FileHelpers', () => {
	const mockFetch = vi.mocked(networkModule.fetch)

	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('urlToArrayBuffer', () => {
		it('should fetch URL and convert to ArrayBuffer', async () => {
			const mockArrayBuffer = new ArrayBuffer(16)
			const mockResponse = {
				arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer),
			}
			mockFetch.mockResolvedValue(mockResponse as any)

			const result = await FileHelpers.urlToArrayBuffer('https://example.com/file.bin')

			expect(mockFetch).toHaveBeenCalledWith('https://example.com/file.bin')
			expect(mockResponse.arrayBuffer).toHaveBeenCalled()
			expect(result).toBe(mockArrayBuffer)
		})

		it('should propagate fetch errors', async () => {
			mockFetch.mockRejectedValue(new Error('Network error'))

			await expect(FileHelpers.urlToArrayBuffer('https://example.com/file.bin')).rejects.toThrow(
				'Network error'
			)
		})

		it('should propagate arrayBuffer conversion errors', async () => {
			const mockResponse = {
				arrayBuffer: vi.fn().mockRejectedValue(new Error('Conversion error')),
			}
			mockFetch.mockResolvedValue(mockResponse as any)

			await expect(FileHelpers.urlToArrayBuffer('https://example.com/file.bin')).rejects.toThrow(
				'Conversion error'
			)
		})
	})

	describe('urlToBlob', () => {
		it('should fetch URL and convert to Blob', async () => {
			const mockBlob = new Blob(['test content'], { type: 'text/plain' })
			const mockResponse = {
				blob: vi.fn().mockResolvedValue(mockBlob),
			}
			mockFetch.mockResolvedValue(mockResponse as any)

			const result = await FileHelpers.urlToBlob('https://example.com/file.txt')

			expect(mockFetch).toHaveBeenCalledWith('https://example.com/file.txt')
			expect(mockResponse.blob).toHaveBeenCalled()
			expect(result).toBe(mockBlob)
		})

		it('should propagate fetch errors', async () => {
			mockFetch.mockRejectedValue(new Error('Network error'))

			await expect(FileHelpers.urlToBlob('https://example.com/file.txt')).rejects.toThrow(
				'Network error'
			)
		})

		it('should propagate blob conversion errors', async () => {
			const mockResponse = {
				blob: vi.fn().mockRejectedValue(new Error('Blob error')),
			}
			mockFetch.mockResolvedValue(mockResponse as any)

			await expect(FileHelpers.urlToBlob('https://example.com/file.txt')).rejects.toThrow(
				'Blob error'
			)
		})
	})

	describe('urlToDataUrl', () => {
		it('should return data URL unchanged if already a data URL', async () => {
			const dataUrl = 'data:text/plain;base64,SGVsbG8gV29ybGQ='
			const result = await FileHelpers.urlToDataUrl(dataUrl)

			expect(result).toBe(dataUrl)
			expect(mockFetch).not.toHaveBeenCalled()
		})

		it('should fetch URL and convert to data URL', async () => {
			const mockBlob = new Blob(['Hello World'], { type: 'text/plain' })
			const mockResponse = {
				blob: vi.fn().mockResolvedValue(mockBlob),
			}
			mockFetch.mockResolvedValue(mockResponse as any)

			const result = await FileHelpers.urlToDataUrl('https://example.com/file.txt')

			expect(mockFetch).toHaveBeenCalledWith('https://example.com/file.txt')
			expect(result).toBe('data:text/plain;base64,SGVsbG8gV29ybGQ=')
		})

		it('should handle different data URL protocols', async () => {
			const dataUrls = [
				'data:text/plain;base64,SGVsbG8=',
				'data:image/png;base64,iVBORw0KGgo...',
				'data:application/json;charset=utf-8;base64,eyJ0ZXN0IjoidmFsdWUifQ==',
			]

			for (const dataUrl of dataUrls) {
				const result = await FileHelpers.urlToDataUrl(dataUrl)
				expect(result).toBe(dataUrl)
			}

			expect(mockFetch).not.toHaveBeenCalled()
		})

		it('should propagate urlToBlob errors', async () => {
			mockFetch.mockRejectedValue(new Error('Fetch failed'))

			await expect(FileHelpers.urlToDataUrl('https://example.com/file.txt')).rejects.toThrow(
				'Fetch failed'
			)
		})
	})

	describe('blobToDataUrl', () => {
		it('should convert Blob to data URL', async () => {
			const blob = new Blob(['Hello World'], { type: 'text/plain' })
			const result = await FileHelpers.blobToDataUrl(blob)

			expect(result).toBe('data:text/plain;base64,SGVsbG8gV29ybGQ=')
		})

		it('should handle different blob types', async () => {
			const textBlob = new Blob(['test'], { type: 'text/plain' })
			const imageBlob = new Blob(['fake image data'], { type: 'image/png' })
			const binaryBlob = new Blob(['binary'], { type: 'application/octet-stream' })

			const textResult = await FileHelpers.blobToDataUrl(textBlob)
			const imageResult = await FileHelpers.blobToDataUrl(imageBlob)
			const binaryResult = await FileHelpers.blobToDataUrl(binaryBlob)

			expect(textResult).toBe('data:text/plain;base64,SGVsbG8gV29ybGQ=')
			expect(imageResult).toBe(
				'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGBGBgAAAABJRU5ErkJggg=='
			)
			expect(binaryResult).toBe('data:application/octet-stream;base64,SGVsbG8gV29ybGQ=')
		})

		it('should handle empty blobs', async () => {
			const emptyBlob = new Blob([], { type: 'text/plain' })
			const result = await FileHelpers.blobToDataUrl(emptyBlob)

			expect(result).toBe('data:text/plain;base64,SGVsbG8gV29ybGQ=')
		})

		it('should reject on FileReader error', async () => {
			const blob = new Blob(['test'], { type: 'text/plain' })

			// Mock FileReader to simulate error
			const originalFileReader = global.FileReader
			global.FileReader = class extends MockFileReader {
				override readAsDataURL() {
					setTimeout(() => this.simulateError(), 0)
				}
			} as any

			await expect(FileHelpers.blobToDataUrl(blob)).rejects.toBeInstanceOf(ProgressEvent)

			// Restore original FileReader
			global.FileReader = originalFileReader
		})

		it('should reject on FileReader abort', async () => {
			const blob = new Blob(['test'], { type: 'text/plain' })

			// Mock FileReader to simulate abort
			const originalFileReader = global.FileReader
			global.FileReader = class extends MockFileReader {
				override readAsDataURL() {
					setTimeout(() => this.simulateAbort(), 0)
				}
			} as any

			await expect(FileHelpers.blobToDataUrl(blob)).rejects.toBeInstanceOf(ProgressEvent)

			// Restore original FileReader
			global.FileReader = originalFileReader
		})
	})

	describe('blobToText', () => {
		it('should convert Blob to text', async () => {
			const blob = new Blob(['Hello World'], { type: 'text/plain' })
			const result = await FileHelpers.blobToText(blob)

			expect(result).toBe('Hello World')
		})

		it('should handle different text encodings', async () => {
			const textBlob = new Blob(['Some text content'], { type: 'text/plain' })
			const htmlBlob = new Blob(['<html><body>Test</body></html>'], { type: 'text/html' })
			const jsonBlob = new Blob(['{"key": "value"}'], { type: 'application/json' })

			const textResult = await FileHelpers.blobToText(textBlob)
			const htmlResult = await FileHelpers.blobToText(htmlBlob)
			const jsonResult = await FileHelpers.blobToText(jsonBlob)

			expect(textResult).toBe('Hello World') // Mocked content
			expect(htmlResult).toBe('Hello World') // Mocked content
			expect(jsonResult).toBe('Hello World') // Mocked content
		})

		it('should handle empty blobs', async () => {
			const emptyBlob = new Blob([], { type: 'text/plain' })

			// Mock FileReader for empty content
			const originalFileReader = global.FileReader
			global.FileReader = class extends MockFileReader {
				override readAsText() {
					setTimeout(() => {
						this.result = ''
						this.onload?.(new ProgressEvent('load') as any)
					}, 0)
				}
			} as any

			const result = await FileHelpers.blobToText(emptyBlob)
			expect(result).toBe('')

			// Restore original FileReader
			global.FileReader = originalFileReader
		})

		it('should reject on FileReader error', async () => {
			const blob = new Blob(['test'], { type: 'text/plain' })

			// Mock FileReader to simulate error
			const originalFileReader = global.FileReader
			global.FileReader = class extends MockFileReader {
				override readAsText() {
					setTimeout(() => this.simulateError(), 0)
				}
			} as any

			await expect(FileHelpers.blobToText(blob)).rejects.toBeInstanceOf(ProgressEvent)

			// Restore original FileReader
			global.FileReader = originalFileReader
		})

		it('should reject on FileReader abort', async () => {
			const blob = new Blob(['test'], { type: 'text/plain' })

			// Mock FileReader to simulate abort
			const originalFileReader = global.FileReader
			global.FileReader = class extends MockFileReader {
				override readAsText() {
					setTimeout(() => this.simulateAbort(), 0)
				}
			} as any

			await expect(FileHelpers.blobToText(blob)).rejects.toBeInstanceOf(ProgressEvent)

			// Restore original FileReader
			global.FileReader = originalFileReader
		})
	})

	describe('rewriteMimeType', () => {
		describe('with Blob objects', () => {
			it('should return the same blob if MIME type matches', () => {
				const blob = new Blob(['content'], { type: 'text/plain' })
				const result = FileHelpers.rewriteMimeType(blob, 'text/plain')

				expect(result).toBe(blob) // Same reference
			})

			it('should create new blob with different MIME type', () => {
				const blob = new Blob(['content'], { type: 'text/plain' })
				const result = FileHelpers.rewriteMimeType(blob, 'application/json')

				expect(result).not.toBe(blob) // Different reference
				expect(result.type).toBe('application/json')
				expect(result.size).toBe(blob.size)
				expect(result).toBeInstanceOf(Blob)
				expect(result).not.toBeInstanceOf(File)
			})

			it('should handle empty MIME type', () => {
				const blob = new Blob(['content'], { type: 'text/plain' })
				const result = FileHelpers.rewriteMimeType(blob, '')

				expect(result.type).toBe('')
				expect(result.size).toBe(blob.size)
			})

			it('should handle blobs without initial MIME type', () => {
				const blob = new Blob(['content']) // No type specified
				const result = FileHelpers.rewriteMimeType(blob, 'text/plain')

				expect(result.type).toBe('text/plain')
				expect(result.size).toBe(blob.size)
			})
		})

		describe('with File objects', () => {
			it('should return the same file if MIME type matches', () => {
				const file = new File(['content'], 'test.txt', { type: 'text/plain' })
				const result = FileHelpers.rewriteMimeType(file, 'text/plain')

				expect(result).toBe(file) // Same reference
			})

			it('should create new file with different MIME type', () => {
				const file = new File(['content'], 'test.txt', { type: 'text/plain' })
				const result = FileHelpers.rewriteMimeType(file, 'application/json')

				expect(result).not.toBe(file) // Different reference
				expect(result.type).toBe('application/json')
				if (result instanceof File) {
					expect(result.name).toBe('test.txt') // Name preserved
				}
				expect(result.size).toBe(file.size)
				expect(result).toBeInstanceOf(File)
			})

			it('should preserve file name and other properties', () => {
				const file = new File(['content'], 'document.pdf', {
					type: 'application/pdf',
					lastModified: 1234567890,
				})
				const result = FileHelpers.rewriteMimeType(file, 'text/plain') as File

				expect(result.name).toBe('document.pdf')
				expect(result.type).toBe('text/plain')
				expect(result.size).toBe(file.size)
				// Note: lastModified might not be preserved in some implementations
			})

			it('should handle files with special characters in name', () => {
				const file = new File(['content'], 'tést file (1).txt', { type: 'text/plain' })
				const result = FileHelpers.rewriteMimeType(file, 'application/json') as File

				expect(result.name).toBe('tést file (1).txt')
				expect(result.type).toBe('application/json')
			})

			it('should handle empty file name', () => {
				const file = new File(['content'], '', { type: 'text/plain' })
				const result = FileHelpers.rewriteMimeType(file, 'application/json') as File

				expect(result.name).toBe('')
				expect(result.type).toBe('application/json')
			})
		})

		describe('type overloads', () => {
			it('should maintain correct types for Blob input', () => {
				const blob = new Blob(['content'], { type: 'text/plain' })
				const result = FileHelpers.rewriteMimeType(blob, 'application/json')

				// TypeScript should infer result as Blob
				expect(result).toBeInstanceOf(Blob)
				expect(result).not.toBeInstanceOf(File)
			})

			it('should maintain correct types for File input', () => {
				const file = new File(['content'], 'test.txt', { type: 'text/plain' })
				const result = FileHelpers.rewriteMimeType(file, 'application/json')

				// TypeScript should infer result as File
				expect(result).toBeInstanceOf(File)
				if (result instanceof File) {
					expect(result.name).toBe('test.txt')
				}
			})
		})

		describe('edge cases', () => {
			it('should handle very long MIME types', () => {
				const blob = new Blob(['content'], { type: 'text/plain' })
				const longMimeType =
					'application/vnd.very.long.custom.mimetype.with.many.parts.and.parameters; charset=utf-8; boundary=something'
				const result = FileHelpers.rewriteMimeType(blob, longMimeType)

				expect(result.type).toBe(longMimeType)
			})

			it('should handle MIME types with parameters', () => {
				const blob = new Blob(['content'], { type: 'text/plain' })
				const mimeTypeWithParams = 'text/html; charset=utf-8'
				const result = FileHelpers.rewriteMimeType(blob, mimeTypeWithParams)

				expect(result.type).toBe(mimeTypeWithParams)
			})

			it('should handle case sensitivity in MIME type comparison', () => {
				const blob = new Blob(['content'], { type: 'text/plain' })
				const result = FileHelpers.rewriteMimeType(blob, 'TEXT/PLAIN')

				expect(result).not.toBe(blob) // Should create new blob due to case difference
				// Note: browsers typically normalize MIME types to lowercase
				expect(result.type).toBe('text/plain') // Browser normalizes to lowercase
			})
		})
	})
})
