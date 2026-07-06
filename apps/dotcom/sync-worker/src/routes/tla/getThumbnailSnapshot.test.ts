import { afterEach, describe, expect, it, vi } from 'vitest'
import { Environment } from '../../types'
import {
	THUMBNAIL_RENDER_TOKEN_TTL_MS,
	ThumbnailRenderJob,
	mintThumbnailRenderToken,
} from '../../utils/renderTokens'
import { getPublishedRoomSnapshot } from './getPublishedFile'
import { getThumbnailSnapshot } from './getThumbnailSnapshot'

vi.mock('./getPublishedFile', () => ({
	getPublishedRoomSnapshot: vi.fn(),
}))

afterEach(() => {
	vi.clearAllMocks()
})

const env = { MCP_SCREENSHOT_TOKEN_SECRET: 'test-secret' } as Environment

function makeJob(overrides: Partial<ThumbnailRenderJob> = {}): ThumbnailRenderJob {
	return {
		v: 1,
		kind: 'published',
		slug: 'my-board',
		fileId: 'file-123',
		version: 1751234567890,
		x: 10,
		y: 20,
		z: 0.5,
		width: 1200,
		height: 630,
		theme: 'dark',
		exp: Date.now() + THUMBNAIL_RENDER_TOKEN_TTL_MS,
		...overrides,
	}
}

function makeRequest(token: string | null) {
	const url = new URL('https://sync.tldraw.xyz/app/thumbnail-snapshot')
	if (token !== null) url.searchParams.set('token', token)
	return new Request(url) as any
}

describe('getThumbnailSnapshot', () => {
	it('returns snapshot data and render params for a valid token', async () => {
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue({
			documents: [{ state: { id: 'shape:1', typeName: 'shape' }, lastChangedClock: 0 }],
			schema: { schemaVersion: 2, sequences: {} },
			clock: 0,
		} as any)

		const response = await getThumbnailSnapshot(makeRequest(await mintToken()), env)

		expect(response.status).toBe(200)
		const body = (await response.json()) as any
		expect(body).toEqual({
			error: false,
			records: [{ id: 'shape:1', typeName: 'shape' }],
			schema: { schemaVersion: 2, sequences: {} },
			renderParams: {
				x: 10,
				y: 20,
				z: 0.5,
				width: 1200,
				height: 630,
				theme: 'dark',
			},
		})
		expect(vi.mocked(getPublishedRoomSnapshot)).toHaveBeenCalledWith(env, 'my-board')
	})

	it('rejects requests without a token', async () => {
		const response = await getThumbnailSnapshot(makeRequest(null), env)
		expect(response.status).toBe(400)
	})

	it('rejects invalid and expired tokens', async () => {
		const invalid = await getThumbnailSnapshot(makeRequest('bogus.token'), env)
		expect(invalid.status).toBe(403)

		const expired = await getThumbnailSnapshot(
			makeRequest(await mintToken({ exp: Date.now() - 1 })),
			env
		)
		expect(expired.status).toBe(403)
		expect(vi.mocked(getPublishedRoomSnapshot)).not.toHaveBeenCalled()
	})

	it('returns 404 when the board is no longer published', async () => {
		vi.mocked(getPublishedRoomSnapshot).mockRejectedValue(new Error('not published'))
		const response = await getThumbnailSnapshot(makeRequest(await mintToken()), env)
		expect(response.status).toBe(404)
	})
})

async function mintToken(overrides: Partial<ThumbnailRenderJob> = {}) {
	return mintThumbnailRenderToken(env, makeJob(overrides))
}
