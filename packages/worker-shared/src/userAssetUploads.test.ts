import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	MAX_R2_OBJECT_NAME_BYTES,
	MAX_UPLOAD_SIZE_BYTES,
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

	describe('stored content type', () => {
		function uploadBucket() {
			return {
				head: vi.fn().mockResolvedValue(null),
				get: vi.fn(),
				put: vi.fn().mockResolvedValue({ httpEtag: '"e"' }),
			}
		}

		async function upload(bucket: ReturnType<typeof uploadBucket>, contentType: string | null) {
			return handleUserAssetUpload({
				body: new Response('x').body,
				headers: new Headers(contentType === null ? {} : { 'content-type': contentType }),
				bucket,
				objectName: 'test',
			})
		}

		// image/x-icon isn't in DEFAULT_SUPPORTED_MEDIA_TYPES but is what bookmark favicons are
		// routinely served as, and the bookmark unfurl stores whatever the remote site sends.
		it.each(['image/png', 'image/svg+xml', 'video/mp4', 'image/x-icon', 'image/bmp'])(
			'stores %s as sent',
			async (type) => {
				const bucket = uploadBucket()
				await upload(bucket, type)
				expect(bucket.put.mock.calls[0][2]).toEqual({ httpMetadata: { contentType: type } })
			}
		)

		it('stores a type named in extraInlineContentTypes as sent', async () => {
			const bucket = uploadBucket()
			await handleUserAssetUpload({
				body: new Response('x').body,
				headers: new Headers({ 'content-type': 'application/pdf' }),
				bucket,
				objectName: 'test',
				extraInlineContentTypes: ['application/pdf'],
			})
			expect(bucket.put.mock.calls[0][2]).toEqual({
				httpMetadata: { contentType: 'application/pdf' },
			})
		})

		it('normalizes case and drops media type parameters', async () => {
			const bucket = uploadBucket()
			await upload(bucket, 'IMAGE/PNG; charset=utf-8')
			expect(bucket.put.mock.calls[0][2]).toEqual({ httpMetadata: { contentType: 'image/png' } })
		})

		// The uploader picks the content type, and these objects are served from the app's own
		// origin — so anything the editor can't render is stored as an opaque download.
		it.each(['text/html', 'application/javascript', 'text/html; charset=utf-8', null])(
			'stores %s as an opaque download',
			async (type) => {
				const bucket = uploadBucket()
				await upload(bucket, type)
				expect(bucket.put.mock.calls[0][2]).toEqual({
					httpMetadata: { contentType: 'application/octet-stream' },
				})
			}
		)

		it('does not pass the request headers to R2', async () => {
			const bucket = uploadBucket()
			await handleUserAssetUpload({
				body: new Response('x').body,
				headers: new Headers({
					'content-type': 'image/png',
					'content-disposition': 'inline; filename=x.html',
					'cache-control': 'no-store',
				}),
				bucket,
				objectName: 'test',
			})
			expect(bucket.put.mock.calls[0][2]).toEqual({ httpMetadata: { contentType: 'image/png' } })
		})

		it('rejects an oversized body declared by content-length without reading it', async () => {
			const bucket = uploadBucket()
			const body = new Response('x').body
			const response = await handleUserAssetUpload({
				body,
				headers: new Headers({
					'content-type': 'image/png',
					'content-length': String(MAX_UPLOAD_SIZE_BYTES + 1),
				}),
				bucket,
				objectName: 'test',
			})

			expect(response.status).toBe(413)
			expect(bucket.head).not.toHaveBeenCalled()
			expect(bucket.put).not.toHaveBeenCalled()
			expect(body!.locked).toBe(false)
		})

		it('rejects a body over the size limit without writing it', async () => {
			const bucket = uploadBucket()
			const response = await handleUserAssetUpload({
				body: new Response(new Uint8Array(MAX_UPLOAD_SIZE_BYTES + 1)).body,
				headers: new Headers({ 'content-type': 'image/png' }),
				bucket,
				objectName: 'test',
			})

			expect(response.status).toBe(413)
			expect(bucket.put).not.toHaveBeenCalled()
		})
	})

	describe('served content disposition', () => {
		async function get(storedContentType: string) {
			const bucket = {
				head: vi.fn(),
				put: vi.fn(),
				get: vi.fn().mockResolvedValue({
					body: new Response('x').body,
					httpEtag: '"e"',
					size: 1,
					range: undefined,
					writeHttpMetadata: (headers: Headers) => headers.set('content-type', storedContentType),
				}),
			}
			return handleUserAssetGet({
				request: new Request('https://example.com/assets/test') as any,
				bucket,
				objectName: 'test',
				context: { waitUntil: vi.fn() } as any,
			})
		}

		it.each(['image/png', 'image/svg+xml'])('serves %s inline', async (type) => {
			expect((await get(type)).headers.get('content-disposition')).toBeNull()
		})

		// Objects stored before uploads were vetted still carry their original type, so the check
		// has to happen on the way out too.
		it.each(['text/html', 'application/javascript'])('serves %s as a download', async (type) => {
			expect((await get(type)).headers.get('content-disposition')).toBe('attachment')
		})

		it('serves a type named in extraInlineContentTypes inline', async () => {
			const bucket = {
				head: vi.fn(),
				put: vi.fn(),
				get: vi.fn().mockResolvedValue({
					body: new Response('x').body,
					httpEtag: '"e"',
					size: 1,
					range: undefined,
					writeHttpMetadata: (headers: Headers) => headers.set('content-type', 'application/pdf'),
				}),
			}
			const response = await handleUserAssetGet({
				request: new Request('https://example.com/assets/test') as any,
				bucket,
				objectName: 'test',
				context: { waitUntil: vi.fn() } as any,
				extraInlineContentTypes: ['application/pdf'],
			})
			expect(response.headers.get('content-disposition')).toBeNull()
		})

		// The edge cache can hold a response written before the check existed, under `immutable`.
		it('marks a cached non-media response as a download', async () => {
			match.mockResolvedValue(
				new Response('x', { headers: { 'content-type': 'text/html' }, status: 200 })
			)
			const bucket = { head: vi.fn(), put: vi.fn(), get: vi.fn() }
			const response = await handleUserAssetGet({
				request: new Request('https://example.com/assets/test') as any,
				bucket,
				objectName: 'test',
				context: { waitUntil: vi.fn() } as any,
			})

			expect(response.headers.get('content-disposition')).toBe('attachment')
			expect(await response.text()).toBe('x')
			expect(bucket.get).not.toHaveBeenCalled()
		})

		it('returns a cached media response untouched', async () => {
			const cached = new Response('x', { headers: { 'content-type': 'image/png' }, status: 200 })
			match.mockResolvedValue(cached)
			const response = await handleUserAssetGet({
				request: new Request('https://example.com/assets/test') as any,
				bucket: { head: vi.fn(), put: vi.fn(), get: vi.fn() },
				objectName: 'test',
				context: { waitUntil: vi.fn() } as any,
			})

			expect(response).toBe(cached)
		})
	})
})
