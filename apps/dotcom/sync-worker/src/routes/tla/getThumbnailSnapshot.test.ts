import { afterEach, describe, expect, it, vi } from 'vitest'
import { THUMBNAIL_RENDER_TOKEN_TTL_MS } from '../../config'
import { Environment } from '../../types'
import {
	ThumbnailRenderJob,
	mintThumbnailRenderToken,
	recordMintedRenderToken,
} from '../../utils/renderTokens'
import { getPublishedRoomSnapshot } from './getPublishedFile'
import { getSharedFileRoomSnapshot } from './getSharedFile'
import { getThumbnailSnapshot } from './getThumbnailSnapshot'
import { makeFakeThumbnailsBucket } from './screenshotTestHelpers'

vi.mock('./getPublishedFile', () => ({
	getPublishedRoomSnapshot: vi.fn(),
}))

vi.mock('./getSharedFile', () => ({
	getSharedFileRoomSnapshot: vi.fn(),
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
		version: 1751234567890,
		access: 'render',
		camera: 'content',
		x: 0,
		y: 0,
		z: 1,
		width: 1200,
		height: 630,
		theme: 'dark',
		exp: Date.now() + THUMBNAIL_RENDER_TOKEN_TTL_MS,
		...overrides,
	}
}

function makeRequest(token: string | null) {
	const url = new URL('https://sync.tldraw.xyz/app/thumbnail-render/snapshot')
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
				camera: 'content',
				// Echoed even though `content` makes the render page ignore them, so a job that omits
				// `camera` has a viewport to fall back on without a second shape of response.
				x: 0,
				y: 0,
				z: 1,
				width: 1200,
				height: 630,
				theme: 'dark',
			},
		})
		expect(vi.mocked(getPublishedRoomSnapshot)).toHaveBeenCalledWith(env, 'my-board')
	})

	it('passes the target pageId through to the render params', async () => {
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue({
			documents: [
				{
					state: { id: 'page:abc', typeName: 'page', name: 'A', index: 'a1' },
					lastChangedClock: 0,
				},
				{ state: { id: 'shape:1', typeName: 'shape', parentId: 'page:abc' }, lastChangedClock: 0 },
			],
			schema: { schemaVersion: 2, sequences: {} },
			clock: 0,
		} as any)

		const response = await getThumbnailSnapshot(
			makeRequest(await mintToken({ camera: 'content', pageId: 'page:abc' })),
			env
		)

		expect(response.status).toBe(200)
		const body = (await response.json()) as any
		expect(body.renderParams).toMatchObject({ camera: 'content', pageId: 'page:abc' })
	})

	it('returns 404 when the token targets a page that no longer exists in the snapshot', async () => {
		// A shared file's live snapshot can lose the targeted page to a concurrent edit between the
		// token being minted and the render reloading the snapshot. Rendering a different page would
		// return a PNG mislabeled with the original page name, so the endpoint fails instead.
		vi.mocked(getSharedFileRoomSnapshot).mockResolvedValue({
			documents: [
				{
					state: { id: 'page:still-here', typeName: 'page', name: 'A', index: 'a1' },
					lastChangedClock: 0,
				},
			],
			schema: { schemaVersion: 2, sequences: {} },
			clock: 0,
		} as any)

		const response = await getThumbnailSnapshot(
			makeRequest(
				await mintToken({ kind: 'shared_file', slug: 'file-abc', pageId: 'page:deleted' })
			),
			env
		)

		expect(response.status).toBe(404)
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
		vi.mocked(getPublishedRoomSnapshot).mockRejectedValue(Error('not published'))
		const response = await getThumbnailSnapshot(makeRequest(await mintToken()), env)
		expect(response.status).toBe(404)
	})

	// Every failure answers the same 404 (the render page turns it into an error state, and the
	// capture surfaces it as a generic render failure), so the report is the only thing that says
	// what actually broke.
	it('reports the underlying cause behind the 404', async () => {
		// No ctx is passed, so reportThumbnailError logs instead of reaching Sentry.
		const logged = vi.spyOn(console, 'error').mockImplementation(() => {})

		vi.mocked(getPublishedRoomSnapshot).mockRejectedValue(new Error('connection terminated'))
		expect((await getThumbnailSnapshot(makeRequest(await mintToken()), env)).status).toBe(404)
		expect(logged).toHaveBeenCalledTimes(1)

		logged.mockRestore()
	})

	it('returns 404 rather than throwing on a partial snapshot with no documents', async () => {
		// A corrupt R2 payload can have schema metadata but no documents array.
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue({
			schema: { schemaVersion: 2, sequences: {} },
			clock: 0,
		} as any)
		const response = await getThumbnailSnapshot(makeRequest(await mintToken()), env)
		expect(response.status).toBe(404)
	})

	it('resolves shared-file tokens through the shared-file snapshot source', async () => {
		vi.mocked(getSharedFileRoomSnapshot).mockResolvedValue({
			documents: [{ state: { id: 'shape:1', typeName: 'shape' }, lastChangedClock: 0 }],
			schema: { schemaVersion: 2, sequences: {} },
			clock: 0,
		} as any)

		const response = await getThumbnailSnapshot(
			makeRequest(await mintToken({ kind: 'shared_file', slug: 'file-abc', version: 'etag-1' })),
			env
		)

		expect(response.status).toBe(200)
		expect(vi.mocked(getSharedFileRoomSnapshot)).toHaveBeenCalledWith(env, 'file-abc', {
			access: 'render',
		})
		expect(vi.mocked(getPublishedRoomSnapshot)).not.toHaveBeenCalled()
	})

	// The gate comes from the signed job, not from this route. An MCP token is minted `public`, so it
	// reads under the anonymous gate and stays confined to what the MCP tool could resolve — a board
	// that went private after minting is refused, where a thumbnail render's `render` token is not.
	it('reads under the access level the token was minted with', async () => {
		vi.mocked(getSharedFileRoomSnapshot).mockResolvedValue({
			documents: [{ state: { id: 'shape:1', typeName: 'shape' }, lastChangedClock: 0 }],
			schema: { schemaVersion: 2, sequences: {} },
			clock: 0,
		} as any)

		await getThumbnailSnapshot(
			makeRequest(
				await mintToken({
					kind: 'shared_file',
					slug: 'file-abc',
					version: 'etag-1',
					access: 'public',
				})
			),
			env
		)

		expect(vi.mocked(getSharedFileRoomSnapshot)).toHaveBeenCalledWith(env, 'file-abc', {
			access: 'public',
		})
	})

	// Deleted, not un-shared: this route reads with `access: 'render'`, so a private board resolves and
	// its content is served to the render page. What refuses is a board that is deleted or unknown,
	// which `isFileRenderable` rejects.
	it('returns 404 when the board is deleted during the token window', async () => {
		vi.mocked(getSharedFileRoomSnapshot).mockRejectedValue(Error('not renderable'))
		const response = await getThumbnailSnapshot(
			makeRequest(await mintToken({ kind: 'shared_file', slug: 'file-abc', version: 'etag-1' })),
			env
		)
		expect(response.status).toBe(404)
	})
})

// The route is the place this actually protects something: it serves any board's full document now
// that thumbnails render for every board, so a valid signature must not be sufficient on its own.
describe('getThumbnailSnapshot render token records', () => {
	function makeEnvWithBucket() {
		return {
			MCP_SCREENSHOT_TOKEN_SECRET: 'test-secret',
			THUMBNAILS: makeFakeThumbnailsBucket(),
		} as unknown as Environment
	}

	function snapshotOfOneShape() {
		return {
			documents: [{ state: { id: 'shape:1', typeName: 'shape' }, lastChangedClock: 0 }],
			schema: { schemaVersion: 2, sequences: {} },
			clock: 0,
		} as any
	}

	it('serves a token that was recorded at mint time', async () => {
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(snapshotOfOneShape())
		const envWithBucket = makeEnvWithBucket()
		const job = makeJob()
		const token = await mintThumbnailRenderToken(envWithBucket, job)
		await recordMintedRenderToken(envWithBucket, job, token)

		const response = await getThumbnailSnapshot(makeRequest(token), envWithBucket)

		expect(response.status).toBe(200)
	})

	// The case a leaked MCP_SCREENSHOT_TOKEN_SECRET produces: signatures that verify, for any board,
	// minted by someone who cannot write to our bucket. Refused, and with the same 403 a bad signature
	// gets — which check failed is not the caller's business.
	it('refuses a validly signed token with no record, without reading the board', async () => {
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(snapshotOfOneShape())
		const envWithBucket = makeEnvWithBucket()
		const forged = await mintThumbnailRenderToken(envWithBucket, makeJob())

		const response = await getThumbnailSnapshot(makeRequest(forged), envWithBucket)

		expect(response.status).toBe(403)
		expect(await response.json()).toEqual({
			error: true,
			message: 'Invalid or expired render token',
		})
		// Refused before the board is touched, so a forged token cannot even cause a snapshot read.
		expect(vi.mocked(getPublishedRoomSnapshot)).not.toHaveBeenCalled()
	})

	// A capture that crosses a rolling deploy: minted by the previous worker version, which had no
	// `access` field and wrote no records, then presented to this one. It reads as `public`, so it is
	// served rather than 403ing on a record that was never going to exist.
	it('serves a pre-deploy token that has no access field and no record', async () => {
		vi.mocked(getSharedFileRoomSnapshot).mockResolvedValue(snapshotOfOneShape())
		const envWithBucket = makeEnvWithBucket()
		const token = await mintThumbnailRenderToken(
			envWithBucket,
			makeJob({ kind: 'shared_file', slug: 'file-abc', version: 'etag-1', access: undefined })
		)

		const response = await getThumbnailSnapshot(makeRequest(token), envWithBucket)

		expect(response.status).toBe(200)
		// And under the gate that worker version applied, not the wider one.
		expect(vi.mocked(getSharedFileRoomSnapshot)).toHaveBeenCalledWith(envWithBucket, 'file-abc', {
			access: 'public',
		})
	})
})

async function mintToken(overrides: Partial<ThumbnailRenderJob> = {}) {
	return mintThumbnailRenderToken(env, makeJob(overrides))
}
