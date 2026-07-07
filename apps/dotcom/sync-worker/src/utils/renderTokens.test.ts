import { describe, expect, it } from 'vitest'
import { Environment } from '../types'
import {
	THUMBNAIL_RENDER_TOKEN_TTL_MS,
	ThumbnailRenderJob,
	mintThumbnailRenderToken,
	verifyThumbnailRenderToken,
} from './renderTokens'

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
		const job = makeJob({ kind: 'shared_file', fileId: 'my-board', version: 'etag-abc123' })
		const token = await mintThumbnailRenderToken(env, job)
		expect(await verifyThumbnailRenderToken(env, token)).toEqual(job)
	})

	it('round-trips a content-fit camera job', async () => {
		const job = makeJob({ camera: 'content' })
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
