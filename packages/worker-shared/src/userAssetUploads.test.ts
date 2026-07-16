import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	MAX_R2_OBJECT_NAME_BYTES,
	handleUserAssetGet,
	handleUserAssetUpload,
} from './userAssetUploads'

describe('userAssetUploads', () => {
	const match = vi.fn()
	const putCache = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
		match.mockResolvedValue(undefined)
		putCache.mockResolvedValue(undefined)
		vi.stubGlobal('caches', {
			default: {
				match,
				put: putCache,
			},
		})
	})

	describe('handleUserAssetGet', () => {
		it('returns 400 without calling R2 when the object name is too long', async () => {
			const bucket = {
				head: vi.fn(),
				get: vi.fn(),
				put: vi.fn(),
			}
			const response = await handleUserAssetGet({
				request: new Request('https://example.com/assets/too-long') as any,
				bucket,
				objectName: 'a'.repeat(MAX_R2_OBJECT_NAME_BYTES + 1),
				context: { waitUntil: vi.fn() } as any,
			})

			expect(response.status).toBe(400)
			expect(await response.json()).toEqual({ error: 'Invalid object name' })
			expect(bucket.get).not.toHaveBeenCalled()
			expect(match).not.toHaveBeenCalled()
		})

		it('returns 400 when R2 rejects a valid-looking object name as invalid', async () => {
			const bucket = {
				head: vi.fn(),
				get: vi
					.fn()
					.mockRejectedValue(new Error('get: The specified object name is not valid. (10020)')),
				put: vi.fn(),
			}
			const response = await handleUserAssetGet({
				request: new Request('https://example.com/assets/test') as any,
				bucket,
				objectName: 'test',
				context: { waitUntil: vi.fn() } as any,
			})

			expect(response.status).toBe(400)
			expect(await response.json()).toEqual({ error: 'Invalid object name' })
			expect(bucket.get).toHaveBeenCalledTimes(1)
		})
	})

	describe('handleUserAssetUpload', () => {
		it('returns 400 without calling R2 when the object name is too long', async () => {
			const bucket = {
				head: vi.fn(),
				get: vi.fn(),
				put: vi.fn(),
			}
			const response = await handleUserAssetUpload({
				body: null,
				headers: new Headers(),
				bucket,
				objectName: 'a'.repeat(MAX_R2_OBJECT_NAME_BYTES + 1),
			})

			expect(response.status).toBe(400)
			expect(await response.json()).toEqual({ error: 'Invalid object name' })
			expect(bucket.head).not.toHaveBeenCalled()
			expect(bucket.put).not.toHaveBeenCalled()
		})

		it('returns 400 when R2 rejects a valid-looking object name as invalid', async () => {
			const bucket = {
				head: vi
					.fn()
					.mockRejectedValue(new Error('get: The specified object name is not valid. (10020)')),
				get: vi.fn(),
				put: vi.fn(),
			}
			const response = await handleUserAssetUpload({
				body: null,
				headers: new Headers(),
				bucket,
				objectName: 'test',
			})

			expect(response.status).toBe(400)
			expect(await response.json()).toEqual({ error: 'Invalid object name' })
			expect(bucket.head).toHaveBeenCalledTimes(1)
			expect(bucket.put).not.toHaveBeenCalled()
		})
	})
})
