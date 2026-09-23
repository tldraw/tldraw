import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getBoardThumbnail } from './getBoardThumbnail'
import { getOgImageCacheKey } from './ogImageQueue'
import { makeFakeThumbnailsBucket, makeScreenshotTestEnv } from './screenshotTestHelpers'

vi.mock('../../utils/tla/getAuth', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../utils/tla/getAuth')>()),
	getAuth: vi.fn(),
}))
vi.mock('./mcpAuth', () => ({ authenticateMcpRequest: vi.fn() }))
vi.mock('./mcpServer', () => ({
	resolveSharedBoardForUser: vi.fn(),
	writeMcpAuthRefusalTelemetry: vi.fn(),
}))

const { getAuth } = await import('../../utils/tla/getAuth')
const { authenticateMcpRequest } = await import('./mcpAuth')
const { resolveSharedBoardForUser, writeMcpAuthRefusalTelemetry } = await import('./mcpServer')

// Unsigned: the route only reads `typ` to pick a verifier, and the verifiers themselves are mocked.
function jwtWithTyp(typ: string) {
	const part = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '')
	return `${part({ alg: 'RS256', typ })}.${part({ sub: 'user' })}.sig`
}
const OAUTH_TOKEN = jwtWithTyp('at+jwt')
const SESSION_TOKEN = jwtWithTyp('JWT')

const BOARD = { kind: 'shared_file', slug: 'file-ok', version: 'room-ok' } as const

function makeRequest(boardId = 'file-ok', headers?: HeadersInit) {
	return Object.assign(
		new Request(`https://sync.tldraw.xyz/app/file/${boardId}/thumbnail`, { headers }),
		{ params: { boardId } }
	) as any
}

async function storeThumbnail(
	bucket: ReturnType<typeof makeFakeThumbnailsBucket>,
	version = 'room-ok'
) {
	await bucket.put(getOgImageCacheKey(BOARD as any), new Uint8Array([1, 2, 3]).buffer, {
		customMetadata: { version },
	})
}

beforeEach(() => {
	vi.mocked(getAuth).mockResolvedValue({ userId: 'user-1' } as any)
	vi.mocked(resolveSharedBoardForUser).mockResolvedValue({ ok: true, board: BOARD as any })
})

afterEach(() => vi.clearAllMocks())

describe('getBoardThumbnail', () => {
	it('serves the stored image for a board the caller can see', async () => {
		const bucket = makeFakeThumbnailsBucket()
		await storeThumbnail(bucket)

		const response = await getBoardThumbnail(
			makeRequest(),
			makeScreenshotTestEnv({ THUMBNAILS: bucket })
		)

		expect(response.status).toBe(200)
		expect(response.headers.get('content-type')).toBe('image/png')
		expect(response.headers.get('cache-control')).toBe('private, no-cache')
		expect(response.headers.get('x-tldraw-thumbnail-version')).toBe('room-ok')
		expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1, 2, 3])
		expect(resolveSharedBoardForUser).toHaveBeenCalledWith(expect.anything(), 'file-ok', 'user-1')
	})

	it('answers 304 when the caller already holds the bytes', async () => {
		const bucket = makeFakeThumbnailsBucket()
		await storeThumbnail(bucket)
		const env = makeScreenshotTestEnv({ THUMBNAILS: bucket })
		const etag = (await getBoardThumbnail(makeRequest(), env)).headers.get('etag')!

		const response = await getBoardThumbnail(makeRequest('file-ok', { 'if-none-match': etag }), env)

		expect(response.status).toBe(304)
		expect(response.headers.get('etag')).toBe(etag)
	})

	it('serves the bytes when the caller’s etag is out of date', async () => {
		const bucket = makeFakeThumbnailsBucket()
		await storeThumbnail(bucket)

		const response = await getBoardThumbnail(
			makeRequest('file-ok', { 'if-none-match': '"etag-old"' }),
			makeScreenshotTestEnv({ THUMBNAILS: bucket })
		)

		expect(response.status).toBe(200)
		expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1, 2, 3])
	})

	// "No such board" and "you cannot see it" must be the same answer, or the route is an existence
	// oracle for file ids.
	it('answers 404 for a board the caller cannot see', async () => {
		vi.mocked(resolveSharedBoardForUser).mockResolvedValue({ ok: false, reason: 'not_found' })

		const response = await getBoardThumbnail(
			makeRequest(),
			makeScreenshotTestEnv({ THUMBNAILS: makeFakeThumbnailsBucket() })
		)

		expect(response.status).toBe(404)
	})

	it('answers 404 for a blank board', async () => {
		vi.mocked(resolveSharedBoardForUser).mockResolvedValue({ ok: false, reason: 'board_empty' })

		const response = await getBoardThumbnail(
			makeRequest(),
			makeScreenshotTestEnv({ THUMBNAILS: makeFakeThumbnailsBucket() })
		)

		expect(response.status).toBe(404)
	})

	// A render is never asked for here: listing boards would become a render per tile.
	it('answers 404 without rendering when no image is stored', async () => {
		const env = makeScreenshotTestEnv({ THUMBNAILS: makeFakeThumbnailsBucket() })

		const response = await getBoardThumbnail(makeRequest(), env)

		expect(response.status).toBe(404)
		expect((env.BROWSER as any).quickAction).not.toHaveBeenCalled()
	})

	it('rejects an over-long board id without resolving it', async () => {
		const response = await getBoardThumbnail(
			makeRequest('f'.repeat(129)),
			makeScreenshotTestEnv({ THUMBNAILS: makeFakeThumbnailsBucket() })
		)

		expect(response.status).toBe(404)
		expect(resolveSharedBoardForUser).not.toHaveBeenCalled()
	})

	// A failed lookup is an outage, not a missing board, and must not be drawn as a placeholder.
	it('answers 500 when resolving the board throws', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
		vi.mocked(resolveSharedBoardForUser).mockRejectedValue(new Error('postgres down'))

		const response = await getBoardThumbnail(
			makeRequest(),
			makeScreenshotTestEnv({ THUMBNAILS: makeFakeThumbnailsBucket() })
		)

		expect(response.status).toBe(500)
		expect(consoleError).toHaveBeenCalled()
		consoleError.mockRestore()
	})

	describe('auth', () => {
		it('answers a plain 401 when no credential is presented', async () => {
			vi.mocked(getAuth).mockResolvedValue(null)

			const response = await getBoardThumbnail(
				makeRequest(),
				makeScreenshotTestEnv({ THUMBNAILS: makeFakeThumbnailsBucket() })
			)

			expect(response.status).toBe(401)
			expect(response.headers.get('www-authenticate')).toBeNull()
			expect(authenticateMcpRequest).not.toHaveBeenCalled()
			expect(resolveSharedBoardForUser).not.toHaveBeenCalled()
		})

		it('answers an expired web session with a plain 401, not the MCP challenge', async () => {
			vi.mocked(getAuth).mockResolvedValue(null)

			const response = await getBoardThumbnail(
				makeRequest('file-ok', { authorization: `Bearer ${SESSION_TOKEN}` }),
				makeScreenshotTestEnv({ THUMBNAILS: makeFakeThumbnailsBucket() })
			)

			expect(response.status).toBe(401)
			expect(response.headers.get('www-authenticate')).toBeNull()
			expect(authenticateMcpRequest).not.toHaveBeenCalled()
		})

		it('returns the MCP challenge when an OAuth token is refused', async () => {
			vi.mocked(authenticateMcpRequest).mockResolvedValue({
				ok: false,
				reason: 'invalid_token',
				response: new Response(null, {
					status: 401,
					headers: { 'www-authenticate': 'Bearer resource_metadata="x"' },
				}),
			})

			const response = await getBoardThumbnail(
				makeRequest('file-ok', { authorization: `Bearer ${OAUTH_TOKEN}` }),
				makeScreenshotTestEnv({ THUMBNAILS: makeFakeThumbnailsBucket() })
			)

			expect(response.status).toBe(401)
			expect(response.headers.get('www-authenticate')).toContain('resource_metadata')
			expect(getAuth).not.toHaveBeenCalled()
			expect(writeMcpAuthRefusalTelemetry).toHaveBeenCalledWith(
				expect.anything(),
				expect.anything(),
				'invalid_token',
				'thumbnail'
			)
		})

		it('resolves against the OAuth token’s user', async () => {
			vi.mocked(authenticateMcpRequest).mockResolvedValue({ ok: true, userId: 'user-2' })
			const bucket = makeFakeThumbnailsBucket()
			await storeThumbnail(bucket)

			const response = await getBoardThumbnail(
				makeRequest('file-ok', { authorization: `Bearer ${OAUTH_TOKEN}` }),
				makeScreenshotTestEnv({ THUMBNAILS: bucket })
			)

			expect(response.status).toBe(200)
			expect(resolveSharedBoardForUser).toHaveBeenCalledWith(expect.anything(), 'file-ok', 'user-2')
		})

		it('reports a failed session lookup rather than treating it as signed out', async () => {
			const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
			vi.mocked(getAuth).mockRejectedValue(new Error('clerk unreachable'))

			const response = await getBoardThumbnail(
				makeRequest(),
				makeScreenshotTestEnv({ THUMBNAILS: makeFakeThumbnailsBucket() })
			)

			expect(response.status).toBe(401)
			expect(consoleError).toHaveBeenCalled()
			consoleError.mockRestore()
		})
	})
})
