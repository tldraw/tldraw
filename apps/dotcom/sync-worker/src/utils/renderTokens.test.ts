import { describe, expect, it } from 'vitest'
import { makeFakeThumbnailsBucket } from '../routes/tla/screenshotTestHelpers'
import { Environment } from '../types'
import {
	THUMBNAIL_RENDER_TOKEN_TTL_MS,
	ThumbnailRenderJob,
	isMintedRenderToken,
	mintThumbnailRenderToken,
	recordMintedRenderToken,
	verifyThumbnailRenderToken,
} from './renderTokens'

const env = { MCP_SCREENSHOT_TOKEN_SECRET: 'test-secret' } as Environment

function makeJob(overrides: Partial<ThumbnailRenderJob> = {}): ThumbnailRenderJob {
	return {
		v: 1,
		kind: 'published',
		slug: 'my-board',
		version: 1751234567890,
		camera: 'content',
		x: 0,
		y: 0,
		z: 1,
		width: 1200,
		height: 630,
		theme: 'light',
		exp: Date.now() + THUMBNAIL_RENDER_TOKEN_TTL_MS,
		...overrides,
	}
}

describe('thumbnail render tokens', () => {
	it('round-trips a signed job', async () => {
		const job = makeJob()
		const token = await mintThumbnailRenderToken(env, job)
		expect(await verifyThumbnailRenderToken(env, token)).toEqual(job)
	})

	it('round-trips a shared-file job with a string version', async () => {
		const job = makeJob({ kind: 'shared_file', version: 'etag-abc123' })
		const token = await mintThumbnailRenderToken(env, job)
		expect(await verifyThumbnailRenderToken(env, token)).toEqual(job)
	})

	it('rejects tokens with an unknown kind', async () => {
		const token = await mintThumbnailRenderToken(env, makeJob({ kind: 'bogus' as any }))
		expect(await verifyThumbnailRenderToken(env, token)).toBeNull()
	})

	it('rejects tokens with an unknown camera mode', async () => {
		const token = await mintThumbnailRenderToken(env, makeJob({ camera: 'viewport' as any }))
		expect(await verifyThumbnailRenderToken(env, token)).toBeNull()
	})

	// An absent camera is valid and means "use the explicit x/y/z viewport". No surface mints one
	// today — they all ask for `content` — but the path is kept available, so the verifier has to
	// accept it or the worker could not start sending one without a client deploy first.
	it('accepts a token with no camera mode, carrying its viewport through', async () => {
		const job = makeJob({ camera: undefined, x: 120, y: -40, z: 0.75 })
		const token = await mintThumbnailRenderToken(env, job)
		expect(await verifyThumbnailRenderToken(env, token)).toEqual(job)
	})

	it('round-trips a single-page (pageId) job', async () => {
		const job = makeJob({ pageId: 'page:abc123' })
		const token = await mintThumbnailRenderToken(env, job)
		expect(await verifyThumbnailRenderToken(env, token)).toEqual(job)
	})

	it('rejects tokens with a non-string pageId', async () => {
		const token = await mintThumbnailRenderToken(env, makeJob({ pageId: 42 as any }))
		expect(await verifyThumbnailRenderToken(env, token)).toBeNull()
	})

	it('rejects expired tokens', async () => {
		const job = makeJob({ exp: Date.now() - 1 })
		const token = await mintThumbnailRenderToken(env, job)
		expect(await verifyThumbnailRenderToken(env, token)).toBeNull()
	})

	it('rejects tampered payloads', async () => {
		const token = await mintThumbnailRenderToken(env, makeJob())
		const [, signature] = token.split('.')
		const tamperedJob = makeJob({ slug: 'other-board' })
		const tamperedPayload = Buffer.from(JSON.stringify(tamperedJob))
			.toString('base64url')
			.replace(/=+$/, '')
		expect(await verifyThumbnailRenderToken(env, `${tamperedPayload}.${signature}`)).toBeNull()
	})

	it('rejects tokens signed with a different secret', async () => {
		const otherEnv = { MCP_SCREENSHOT_TOKEN_SECRET: 'other-secret' } as Environment
		const token = await mintThumbnailRenderToken(otherEnv, makeJob())
		expect(await verifyThumbnailRenderToken(env, token)).toBeNull()
	})

	it('rejects malformed tokens', async () => {
		expect(await verifyThumbnailRenderToken(env, 'not-a-token')).toBeNull()
		expect(await verifyThumbnailRenderToken(env, 'a.b.c')).toBeNull()
		expect(await verifyThumbnailRenderToken(env, '.')).toBeNull()
	})

	it('refuses to mint or verify without a configured secret', async () => {
		const emptyEnv = {} as Environment
		await expect(mintThumbnailRenderToken(emptyEnv, makeJob())).rejects.toThrow(
			'MCP_SCREENSHOT_TOKEN_SECRET'
		)
		const token = await mintThumbnailRenderToken(env, makeJob())
		expect(await verifyThumbnailRenderToken(emptyEnv, token)).toBeNull()
	})
})

// A signature only proves someone holds the secret. The record proves *we* minted the token, which is
// what keeps a leaked MCP_SCREENSHOT_TOKEN_SECRET from being enough to read a private board.
describe('render token records', () => {
	function makeEnvWithBucket() {
		return {
			MCP_SCREENSHOT_TOKEN_SECRET: 'test-secret',
			THUMBNAILS: makeFakeThumbnailsBucket(),
		} as unknown as Environment
	}

	it('accepts a token it recorded', async () => {
		const envWithBucket = makeEnvWithBucket()
		const job = makeJob()
		const token = await mintThumbnailRenderToken(envWithBucket, job)

		await recordMintedRenderToken(envWithBucket, job, token)

		expect(await isMintedRenderToken(envWithBucket, job, token)).toBe(true)
	})

	// The whole point: a perfectly valid signature is refused when we never minted it. This is the
	// case a compromised secret produces.
	it('refuses a validly signed token that was never recorded', async () => {
		const envWithBucket = makeEnvWithBucket()
		const job = makeJob()
		const forged = await mintThumbnailRenderToken(envWithBucket, job)

		// The signature verifies...
		expect(await verifyThumbnailRenderToken(envWithBucket, forged)).toEqual(job)
		// ...and it is still refused, because no record of it exists.
		expect(await isMintedRenderToken(envWithBucket, job, forged)).toBe(false)
	})

	// Records are keyed per board, so one board's record cannot vouch for another's token.
	it('refuses a token recorded against a different board', async () => {
		const envWithBucket = makeEnvWithBucket()
		const mine = makeJob({ slug: 'my-board' })
		const other = makeJob({ slug: 'someone-elses-board' })
		const otherToken = await mintThumbnailRenderToken(envWithBucket, other)
		await recordMintedRenderToken(envWithBucket, other, otherToken)

		expect(await isMintedRenderToken(envWithBucket, mine, otherToken)).toBe(false)
	})

	// Per board, not per token: a board's newest render replaces the record, so an older in-flight
	// token for the same board stops working. The pending marker single-flights renders per board, so
	// this should not arise in practice — but it is the behaviour, not an accident.
	it('replaces a board record on the next mint', async () => {
		const envWithBucket = makeEnvWithBucket()
		const job = makeJob()
		const first = await mintThumbnailRenderToken(envWithBucket, job)
		await recordMintedRenderToken(envWithBucket, job, first)

		const second = await mintThumbnailRenderToken(envWithBucket, { ...job, exp: job.exp + 1 })
		await recordMintedRenderToken(envWithBucket, job, second)

		expect(await isMintedRenderToken(envWithBucket, job, second)).toBe(true)
		expect(await isMintedRenderToken(envWithBucket, job, first)).toBe(false)
	})

	// Local dev and tests run without the bucket. Skipping degrades to signature-only verification —
	// the level this replaces — rather than refusing every render.
	it('falls back to trusting the signature when no bucket is configured', async () => {
		const job = makeJob()
		const token = await mintThumbnailRenderToken(env, job)

		expect(await isMintedRenderToken(env, job, token)).toBe(true)
	})

	// The bucket must never hold something usable as a credential.
	it('stores a hash, never the token', async () => {
		const envWithBucket = makeEnvWithBucket()
		const job = makeJob()
		const token = await mintThumbnailRenderToken(envWithBucket, job)

		await recordMintedRenderToken(envWithBucket, job, token)

		const stored = JSON.stringify([...(envWithBucket.THUMBNAILS as any).store])
		expect(stored).not.toContain(token)
		expect(stored).toContain('tokenHash')
	})
})
