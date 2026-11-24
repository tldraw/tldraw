import { IRequest } from 'itty-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { REAL_IMAGES, jpegBytes, pngBytes } from '../../mcpImageTestHelpers'
import { Environment } from '../../types'
import { getRoomDurableObject } from '../../utils/durableObjects'
import { mintThumbnailRenderToken, verifyThumbnailRenderToken } from '../../utils/renderTokens'
import { hasReadAccessToFile } from '../../utils/tla/getAuth'
import { hasWriteAccessToFile } from '../../utils/tla/hasWriteAccessToFile'
import { IMAGE_UPLOAD_MAX_BYTES, IMAGE_UPLOAD_TTL_MS } from './boardTools'
import {
	addImageForUser,
	createImageUpload,
	mintImageUploadToken,
	uploadMcpImage,
	verifyImageUploadToken,
} from './mcpImages'

vi.mock('../../postgres', () => ({
	createPostgresConnectionPool: () => ({ destroy: async () => {} }),
}))
vi.mock('../../utils/tla/hasWriteAccessToFile', () => ({ hasWriteAccessToFile: vi.fn() }))
vi.mock('../../utils/tla/getAuth', () => ({ hasReadAccessToFile: vi.fn() }))
vi.mock('../../utils/durableObjects', () => ({ getRoomDurableObject: vi.fn() }))

afterEach(() => {
	vi.useRealTimers()
	vi.clearAllMocks()
	vi.unstubAllGlobals()
})

function makeEnv() {
	const objects = new Map<string, any>()
	const env = {
		MCP_SCREENSHOT_TOKEN_SECRET: 'test-secret',
		MCP_SCREENSHOT_RENDER_ORIGIN: 'https://app.example',
		USER_CONTENT_URL: 'https://content.example',
		UPLOADS: {
			head: async (key: string) => objects.get(key) ?? null,
			put: async (key: string, bytes: Uint8Array, options: object) => {
				objects.set(key, { size: bytes.byteLength, ...options })
			},
		},
		QUEUE: { send: vi.fn(async () => {}) },
	}
	return { env: env as unknown as Environment, objects, queue: env.QUEUE.send }
}

const REQUEST = new Request('https://app.example/api/app/mcp') as unknown as IRequest

async function createUpload(env: Environment, boardId = 'board_1') {
	vi.mocked(hasWriteAccessToFile).mockResolvedValue(true)
	const created = await createImageUpload(env, REQUEST, 'user_1', {
		boardId,
		mimeType: 'image/png',
		name: 'login screen.png',
	})
	if (!created.ok) throw new Error('Expected a ticket')
	return created.ticket
}

function put(url: string, body: Uint8Array<ArrayBuffer>, headers: Record<string, string> = {}) {
	const request = new Request(url, { method: 'PUT', body, headers })
	const objectName = new URL(url).pathname.split('/').pop()
	return Object.assign(request, { params: { objectName } }) as unknown as IRequest
}

describe('upload tokens', () => {
	const GRANT = {
		v: 1 as const,
		t: 'mcp_image_upload' as const,
		fileId: 'board_1',
		userId: 'user_1',
		objectName: 'abc-shot-png',
		mimeType: 'image/png' as const,
		name: 'shot.png',
		exp: 2000,
	}

	it('round-trips until it expires, and not after being altered', async () => {
		const { env } = makeEnv()
		const token = await mintImageUploadToken(env, GRANT)
		expect(await verifyImageUploadToken(env, token, 1000)).toEqual(GRANT)
		expect(await verifyImageUploadToken(env, token, 2000)).toBeNull()

		const [payload, signature] = token.split('.')
		const forged = btoa(JSON.stringify({ ...GRANT, fileId: 'board_2' })).replace(/=+$/, '')
		expect(await verifyImageUploadToken(env, `${forged}.${signature}`, 1000)).toBeNull()
		expect(await verifyImageUploadToken(env, payload, 1000)).toBeNull()
	})

	// Both are signed with one secret, so each verifier has to refuse the other's tokens.
	it('is not interchangeable with a render token', async () => {
		const { env } = makeEnv()
		const exp = Date.now() + 60_000
		const renderToken = await mintThumbnailRenderToken(env, {
			v: 1,
			kind: 'published',
			slug: 'board_1',
			exp,
		} as any)
		expect(await verifyImageUploadToken(env, renderToken)).toBeNull()
		const uploadToken = await mintImageUploadToken(env, { ...GRANT, exp })
		expect(await verifyThumbnailRenderToken(env, uploadToken)).toBeNull()
	})
})

describe('create_image_upload', () => {
	it('hands out a URL on the public origin for a board the caller can write to', async () => {
		const { env } = makeEnv()
		const ticket = await createUpload(env)
		expect(ticket.uploadId).toMatch(/^[\w-]+-login-screen-png$/)
		expect(ticket.uploadUrl).toMatch(
			new RegExp(`^https://app\\.example/api/app/mcp/uploads/${ticket.uploadId}\\?token=`)
		)
		expect(ticket).toMatchObject({
			method: 'PUT',
			headers: { 'Content-Type': 'image/png' },
			maxBytes: IMAGE_UPLOAD_MAX_BYTES,
		})
	})

	it('tells a view-only board from one the caller cannot see', async () => {
		const { env } = makeEnv()
		const input = { boardId: 'board_1', mimeType: 'image/png' as const, name: null }
		vi.mocked(hasWriteAccessToFile).mockResolvedValue(false)
		vi.mocked(hasReadAccessToFile).mockResolvedValue({ ok: true } as any)
		expect(await createImageUpload(env, REQUEST, 'user_1', input)).toEqual({
			ok: false,
			reason: 'image_forbidden',
		})
		vi.mocked(hasReadAccessToFile).mockResolvedValue({ ok: false } as any)
		expect(await createImageUpload(env, REQUEST, 'user_1', input)).toEqual({
			ok: false,
			reason: 'not_found',
		})
	})
})

describe('the upload route', () => {
	it('stores the file with what was read from it, once', async () => {
		const { env, objects, queue } = makeEnv()
		const ticket = await createUpload(env)

		const response = await uploadMcpImage(put(ticket.uploadUrl, pngBytes(800, 600)), env)
		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({ uploadId: ticket.uploadId, w: 800, h: 600 })
		expect(objects.get(ticket.uploadId)).toMatchObject({
			httpMetadata: { contentType: 'image/png' },
			customMetadata: { fileId: 'board_1', name: 'login screen.png', w: '800', h: '600' },
		})
		// The same message a tldraw.com upload sends, which ties the object to the board in Postgres.
		expect(queue).toHaveBeenCalledWith({
			type: 'asset-upload',
			objectName: ticket.uploadId,
			fileId: 'board_1',
			userId: 'user_1',
		})

		const again = await uploadMcpImage(put(ticket.uploadUrl, pngBytes(1, 1)), env)
		expect(again.status).toBe(409)
		expect(queue).toHaveBeenCalledTimes(1)
	})

	it('refuses a bad token, and a token moved to another object', async () => {
		const { env, objects } = makeEnv()
		const ticket = await createUpload(env)
		const tampered = ticket.uploadUrl.replace(/token=.{8}/, 'token=AAAAAAAA')
		expect((await uploadMcpImage(put(tampered, pngBytes(1, 1)), env)).status).toBe(403)
		const moved = ticket.uploadUrl.replace(ticket.uploadId, 'someone-elses-object')
		expect((await uploadMcpImage(put(moved, pngBytes(1, 1)), env)).status).toBe(403)
		expect(objects.size).toBe(0)
	})

	it('refuses a URL that has run out, and takes the file a moment before', async () => {
		vi.useFakeTimers({ now: Date.UTC(2026, 0, 1) })
		const { env, objects } = makeEnv()
		const ticket = await createUpload(env)
		expect(Date.parse(ticket.expiresAt) - Date.now()).toBe(IMAGE_UPLOAD_TTL_MS)

		vi.setSystemTime(Date.parse(ticket.expiresAt))
		const late = await uploadMcpImage(put(ticket.uploadUrl, pngBytes(1, 1)), env)
		expect(late.status).toBe(403)
		expect(objects.size).toBe(0)

		vi.setSystemTime(Date.parse(ticket.expiresAt) - 1)
		expect((await uploadMcpImage(put(ticket.uploadUrl, pngBytes(1, 1)), env)).status).toBe(200)
	})

	it('takes each supported type as a real file, and reads its size', async () => {
		const { env, objects } = makeEnv()
		vi.mocked(hasWriteAccessToFile).mockResolvedValue(true)
		const files = [
			['image/jpeg', REAL_IMAGES.rotatedJpeg, { w: 16, h: 24 }],
			['image/gif', REAL_IMAGES.gif, { w: 24, h: 16 }],
			['image/webp', REAL_IMAGES.webpLossy, { w: 1, h: 1 }],
			['image/webp', REAL_IMAGES.webpLossless, { w: 1, h: 1 }],
		] as const
		for (const [mimeType, bytes, size] of files) {
			const created = await createImageUpload(env, REQUEST, 'user_1', {
				boardId: 'board_1',
				mimeType,
				name: null,
			})
			if (!created.ok) throw new Error('Expected a ticket')
			const { uploadId, uploadUrl } = created.ticket
			const response = await uploadMcpImage(put(uploadUrl, bytes as Uint8Array<ArrayBuffer>), env)
			expect(await response.json()).toEqual({ uploadId, ...size })
			expect(objects.get(uploadId).httpMetadata).toEqual({ contentType: mimeType })
		}
	})

	// The declared type is what the model said; the bytes are what arrived.
	it('refuses a file that is not the type the URL was made for', async () => {
		const { env, objects } = makeEnv()
		const ticket = await createUpload(env)
		const notPng = [jpegBytes(10, 10), new TextEncoder().encode('<svg/>')]
		for (const body of notPng) {
			expect((await uploadMcpImage(put(ticket.uploadUrl, body), env)).status).toBe(415)
		}
		expect(objects.size).toBe(0)
	})

	it('refuses a file over the limit, whatever its content-length says', async () => {
		const { env, objects } = makeEnv()
		const ticket = await createUpload(env)
		const huge = new Uint8Array(IMAGE_UPLOAD_MAX_BYTES + 1)
		huge.set(pngBytes(10, 10))
		expect((await uploadMcpImage(put(ticket.uploadUrl, huge), env)).status).toBe(413)
		const declared = put(ticket.uploadUrl, pngBytes(10, 10), {
			'content-length': String(IMAGE_UPLOAD_MAX_BYTES + 1),
		})
		expect((await uploadMcpImage(declared, env)).status).toBe(413)
		expect(objects.size).toBe(0)
	})
})

describe('add_image', () => {
	const PLACED = {
		ok: true as const,
		shapeId: 'shape:x',
		pageId: 'page:one',
		pageName: 'First',
		x: 0,
		y: 0,
		w: 800,
		h: 600,
	}
	const INPUT = { boardId: 'board_1', pageId: null, position: null, w: null, altText: null }

	function mockRoom() {
		const writeMcpImage = vi.fn(async (_args: any) => PLACED)
		vi.mocked(getRoomDurableObject).mockReturnValue({ writeMcpImage } as any)
		vi.mocked(hasWriteAccessToFile).mockResolvedValue(true)
		return writeMcpImage
	}

	it('places a file uploaded for this board', async () => {
		const { env } = makeEnv()
		const ticket = await createUpload(env)
		await uploadMcpImage(put(ticket.uploadUrl, pngBytes(800, 600)), env)
		const writeMcpImage = mockRoom()

		const source = { kind: 'upload' as const, uploadId: ticket.uploadId }
		expect(await addImageForUser(env, 'user_1', { ...INPUT, source })).toEqual(PLACED)
		expect(writeMcpImage.mock.calls[0][0]).toMatchObject({
			fileId: 'board_1',
			userId: 'user_1',
			image: {
				objectName: ticket.uploadId,
				src: `https://content.example/${ticket.uploadId}`,
				name: 'login screen.png',
				fileSize: 24,
				info: { mimeType: 'image/png', w: 800, h: 600, isAnimated: false },
			},
		})
	})

	// An uploadId is an object name, and the bucket holds every board's images.
	it('refuses an upload made for another board, one never sent, and any other object', async () => {
		const { env, objects } = makeEnv()
		const other = await createUpload(env, 'board_2')
		await uploadMcpImage(put(other.uploadUrl, pngBytes(800, 600)), env)
		const unsent = await createUpload(env)
		objects.set('pasted-by-a-browser', { size: 10, httpMetadata: { contentType: 'image/png' } })
		const writeMcpImage = mockRoom()

		for (const uploadId of [other.uploadId, unsent.uploadId, 'pasted-by-a-browser']) {
			const source = { kind: 'upload' as const, uploadId }
			expect(await addImageForUser(env, 'user_1', { ...INPUT, source })).toEqual({
				ok: false,
				reason: 'upload_not_found',
				uploadId,
			})
		}
		expect(writeMcpImage).not.toHaveBeenCalled()
	})

	it('copies an image from the web into storage before placing it', async () => {
		const { env, objects, queue } = makeEnv()
		const writeMcpImage = mockRoom()
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(jpegBytes(640, 480)))
		)

		const source = { kind: 'url' as const, url: 'https://example.com/pics/cat%20photo.jpg?x=1' }
		expect(await addImageForUser(env, 'user_1', { ...INPUT, source })).toEqual(PLACED)
		const [[objectName, stored]] = [...objects]
		expect(stored.httpMetadata).toEqual({ contentType: 'image/jpeg' })
		expect(queue).toHaveBeenCalledTimes(1)
		expect(writeMcpImage.mock.calls[0][0].image).toMatchObject({
			objectName,
			src: `https://content.example/${objectName}`,
			name: 'cat photo.jpg',
			info: { mimeType: 'image/jpeg', w: 640, h: 480 },
		})
	})

	it('says why an image from the web could not be used, and stores nothing', async () => {
		const { env, objects } = makeEnv()
		const writeMcpImage = mockRoom()
		const url = 'https://example.com/a.png'
		const source = { kind: 'url' as const, url }
		const outcomes: Array<[() => Promise<Response>, object]> = [
			[async () => new Response('nope', { status: 404 }), { reason: 'image_fetch_failed', url }],
			[() => Promise.reject(new Error('dns')), { reason: 'image_fetch_failed', url }],
			[async () => new Response('<html>'), { reason: 'image_unsupported' }],
			[
				async () => new Response(new Uint8Array(IMAGE_UPLOAD_MAX_BYTES + 1)),
				{ reason: 'image_too_large' },
			],
		]
		for (const [respond, refusal] of outcomes) {
			vi.stubGlobal('fetch', vi.fn(respond))
			expect(await addImageForUser(env, 'user_1', { ...INPUT, source })).toEqual({
				ok: false,
				...refusal,
			})
		}
		expect(objects.size).toBe(0)
		expect(writeMcpImage).not.toHaveBeenCalled()
	})

	// Before the fetch: a caller with no access must not be able to make this worker fetch a URL or
	// fill the bucket.
	it('fetches nothing for a board the caller cannot write to', async () => {
		const { env } = makeEnv()
		mockRoom()
		vi.mocked(hasWriteAccessToFile).mockResolvedValue(false)
		vi.mocked(hasReadAccessToFile).mockResolvedValue({ ok: false } as any)
		const fetched = vi.fn()
		vi.stubGlobal('fetch', fetched)

		const source = { kind: 'url' as const, url: 'https://example.com/a.png' }
		expect(await addImageForUser(env, 'user_1', { ...INPUT, source })).toEqual({
			ok: false,
			reason: 'not_found',
		})
		expect(fetched).not.toHaveBeenCalled()
	})
})
