import { describe, expect, it } from 'vitest'
import { THUMBNAIL_RENDER_TOKEN_TTL_MS } from '../config'
import { makeFakeThumbnailsBucket } from '../routes/tla/screenshotTestHelpers'
import { Environment } from '../types'
import { sha256 } from './hash'
import {
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
		access: 'render',
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

	// The access level decides which gate the snapshot route reads under, so an unrecognised one must
	// not fall through to a default — it is refused outright.
	it('rejects tokens with an unknown access level', async () => {
		const token = await mintThumbnailRenderToken(env, makeJob({ access: 'admin' as any }))
		expect(await verifyThumbnailRenderToken(env, token)).toBeNull()
	})

	it('round-trips the access level it was minted with', async () => {
		const job = makeJob({ access: 'public' })
		const token = await mintThumbnailRenderToken(env, job)
		expect(await verifyThumbnailRenderToken(env, token)).toEqual(job)
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
	// token for the same board stops working. Only the OG pipeline is recorded, and it is single-flighted
	// per board by the pending marker, so this is the intended "fresher render wins" rather than two
	// unrelated captures colliding.
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

	// A `public` job renders a board anyone could fetch anyway, so the record buys no security and is
	// skipped. Keeping the MCP tool out of the record entirely is what stops it sharing a key space
	// with the OG pipeline.
	it('does not record a public job, and accepts it with no record', async () => {
		const envWithBucket = makeEnvWithBucket()
		const job = makeJob({ access: 'public' })
		const token = await mintThumbnailRenderToken(envWithBucket, job)

		await recordMintedRenderToken(envWithBucket, job, token)

		expect([...(envWithBucket.THUMBNAILS as any).store.keys()]).toEqual([])
		expect(await isMintedRenderToken(envWithBucket, job, token)).toBe(true)
	})

	// The guarantee the two surfaces rest on: an MCP capture cannot invalidate a thumbnail render of the
	// same board, because it writes nothing. Were it to share the key, the render's token would stop
	// verifying mid-flight and the capture would 403.
	it('leaves a render record intact when a public job is minted for the same board', async () => {
		const envWithBucket = makeEnvWithBucket()
		const render = makeJob({ access: 'render' })
		const renderToken = await mintThumbnailRenderToken(envWithBucket, render)
		await recordMintedRenderToken(envWithBucket, render, renderToken)

		const capture = makeJob({ access: 'public', pageId: 'page:two' })
		await recordMintedRenderToken(
			envWithBucket,
			capture,
			await mintThumbnailRenderToken(envWithBucket, capture)
		)

		expect(await isMintedRenderToken(envWithBucket, render, renderToken)).toBe(true)
	})

	// A token still in flight from a worker version minted before the field existed. Those were served
	// under the public gate and never recorded, so reading them as `public` is what keeps captures
	// crossing a rolling deploy from 403ing on a record that was never going to be there.
	it('treats a job with no access as public, accepting it with no record', async () => {
		const envWithBucket = makeEnvWithBucket()
		const job = makeJob({ access: undefined })
		const token = await mintThumbnailRenderToken(envWithBucket, job)

		expect(await isMintedRenderToken(envWithBucket, job, token)).toBe(true)

		await recordMintedRenderToken(envWithBucket, job, token)
		expect([...(envWithBucket.THUMBNAILS as any).store.keys()]).toEqual([])
	})

	// Local dev and tests run without the bucket, where the check leaves signature-only verification
	// rather than refusing every render.
	it('falls back to trusting the signature when no bucket is configured', async () => {
		const job = makeJob()
		const token = await mintThumbnailRenderToken(env, job)

		expect(await isMintedRenderToken(env, job, token)).toBe(true)
	})

	// Everything below covers the key namespacing, which is what made it safe for the MCP tool to start
	// minting `render`. Before it, records were one per board, and the OG pipeline could get away with
	// that only because it is single-flighted per board — a guarantee the MCP tool does not have.
	describe('surface namespacing', () => {
		it('keeps concurrent MCP captures of different pages of one board independent', async () => {
			const envWithBucket = makeEnvWithBucket()
			const first = makeJob({ surface: 'mcp', kind: 'shared_file', slug: 'f1', pageId: 'page:a' })
			const second = makeJob({ surface: 'mcp', kind: 'shared_file', slug: 'f1', pageId: 'page:b' })

			const firstToken = await mintThumbnailRenderToken(envWithBucket, first)
			await recordMintedRenderToken(envWithBucket, first, firstToken)
			const secondToken = await mintThumbnailRenderToken(envWithBucket, second)
			await recordMintedRenderToken(envWithBucket, second, secondToken)

			// Both still verify. Under a per-board key the first would now 403 on its snapshot fetch and
			// surface to the caller as a generic render failure.
			expect(await isMintedRenderToken(envWithBucket, first, firstToken)).toBe(true)
			expect(await isMintedRenderToken(envWithBucket, second, secondToken)).toBe(true)
		})

		// The other half: an edit-triggered thumbnail render landing while a capture is in flight.
		it('keeps an MCP capture and an OG render of one board independent', async () => {
			const envWithBucket = makeEnvWithBucket()
			const ogJob = makeJob({ surface: 'og', kind: 'shared_file', slug: 'f1' })
			const mcpJob = makeJob({
				surface: 'mcp',
				kind: 'shared_file',
				slug: 'f1',
				pageId: 'page:a',
			})

			const ogToken = await mintThumbnailRenderToken(envWithBucket, ogJob)
			await recordMintedRenderToken(envWithBucket, ogJob, ogToken)
			const mcpToken = await mintThumbnailRenderToken(envWithBucket, mcpJob)
			await recordMintedRenderToken(envWithBucket, mcpJob, mcpToken)

			expect(await isMintedRenderToken(envWithBucket, ogJob, ogToken)).toBe(true)
			expect(await isMintedRenderToken(envWithBucket, mcpJob, mcpToken)).toBe(true)
		})

		// Same board, same page, different theme: two distinct images, so two distinct captures.
		it('separates themes of the same page', async () => {
			const envWithBucket = makeEnvWithBucket()
			const light = makeJob({ surface: 'mcp', slug: 'f1', pageId: 'page:a', theme: 'light' })
			const dark = makeJob({ surface: 'mcp', slug: 'f1', pageId: 'page:a', theme: 'dark' })

			const lightToken = await mintThumbnailRenderToken(envWithBucket, light)
			await recordMintedRenderToken(envWithBucket, light, lightToken)
			await recordMintedRenderToken(
				envWithBucket,
				dark,
				await mintThumbnailRenderToken(envWithBucket, dark)
			)

			expect(await isMintedRenderToken(envWithBucket, light, lightToken)).toBe(true)
		})

		// The residual the design accepts: the *same* capture asked for twice at once collides, and the
		// later mint wins. That is the OG pipeline's case again — one image, rendered twice — so it costs
		// a retry rather than a wrong result.
		it('still supersedes an identical in-flight capture', async () => {
			const envWithBucket = makeEnvWithBucket()
			const job = makeJob({ surface: 'mcp', slug: 'f1', pageId: 'page:a' })
			const first = await mintThumbnailRenderToken(envWithBucket, job)
			await recordMintedRenderToken(envWithBucket, job, first)

			const second = await mintThumbnailRenderToken(envWithBucket, { ...job, exp: job.exp + 1 })
			await recordMintedRenderToken(envWithBucket, job, second)

			expect(await isMintedRenderToken(envWithBucket, job, second)).toBe(true)
			expect(await isMintedRenderToken(envWithBucket, job, first)).toBe(false)
		})

		// A token minted by the worker version before the field existed, whose record sits at the old
		// un-namespaced key. Without this fallback every OG render in flight across the deploy that
		// introduced namespacing would 403 until its token expired.
		it('finds the pre-namespacing record for a token with no surface', async () => {
			const envWithBucket = makeEnvWithBucket()
			const job = makeJob({ surface: undefined })
			const token = await mintThumbnailRenderToken(envWithBucket, job)
			// Written where the old worker would have written it.
			await (envWithBucket.THUMBNAILS as any).put(
				`render-tokens/${job.kind}/${job.slug}`,
				new Uint8Array(),
				{ customMetadata: { tokenHash: await sha256(token) } }
			)

			expect(await isMintedRenderToken(envWithBucket, job, token)).toBe(true)
		})

		// The fallback is for old tokens only. A current token missing its record must still be refused,
		// or the compatibility path would become a way to reuse the old key as a universal record.
		it('does not fall back to the old key for a token that names its surface', async () => {
			const envWithBucket = makeEnvWithBucket()
			const job = makeJob({ surface: 'og' })
			const token = await mintThumbnailRenderToken(envWithBucket, job)
			await (envWithBucket.THUMBNAILS as any).put(
				`render-tokens/${job.kind}/${job.slug}`,
				new Uint8Array(),
				{ customMetadata: { tokenHash: await sha256(token) } }
			)

			expect(await isMintedRenderToken(envWithBucket, job, token)).toBe(false)
		})
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
