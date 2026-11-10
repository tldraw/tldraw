import { describe, expect, it } from 'vitest'
import { Environment } from '../types'
import { isTabRenderJobIdFor, mintTabRenderJobIds } from './tabRenderJobIds'

const env = { MCP_SCREENSHOT_TOKEN_SECRET: 'test-secret' } as Environment

describe('tab render job ids', () => {
	it('accepts an id for the room it was minted for', async () => {
		const [jobId] = await mintTabRenderJobIds(env, 'room-a', 1)
		expect(await isTabRenderJobIdFor(env, 'room-a', jobId)).toBe(true)
	})

	it('mints a distinct id for each tab', async () => {
		const ids = await mintTabRenderJobIds(env, 'room-a', 3)
		expect(new Set(ids).size).toBe(3)
	})

	it('refuses an id minted for another room', async () => {
		const [jobId] = await mintTabRenderJobIds(env, 'room-a', 1)
		expect(await isTabRenderJobIdFor(env, 'room-b', jobId)).toBe(false)
	})

	it('refuses an id signed with another secret', async () => {
		const other = { MCP_SCREENSHOT_TOKEN_SECRET: 'other-secret' } as Environment
		const [jobId] = await mintTabRenderJobIds(other, 'room-a', 1)
		expect(await isTabRenderJobIdFor(env, 'room-a', jobId)).toBe(false)
	})

	// The signature covers the nonce, so swapping in a fresh one keeps the shape but must fail.
	it('refuses an id whose nonce was swapped', async () => {
		const [jobId] = await mintTabRenderJobIds(env, 'room-a', 1)
		const signature = jobId.split('.')[1]
		const forged = `${crypto.randomUUID()}.${signature}`
		expect(await isTabRenderJobIdFor(env, 'room-a', forged)).toBe(false)
	})

	it('refuses malformed ids without throwing', async () => {
		const [jobId] = await mintTabRenderJobIds(env, 'room-a', 1)
		for (const bad of [
			'',
			'made-up',
			crypto.randomUUID(),
			`${jobId}.extra`,
			`${jobId.split('.')[0]}.!!!`,
		]) {
			expect(await isTabRenderJobIdFor(env, 'room-a', bad), bad).toBe(false)
		}
	})

	// A deployment missing the secret must refuse every reply rather than accept them unchecked.
	it('refuses every id when the secret is missing, and will not mint one', async () => {
		const [jobId] = await mintTabRenderJobIds(env, 'room-a', 1)
		const unset = {} as Environment
		expect(await isTabRenderJobIdFor(unset, 'room-a', jobId)).toBe(false)
		await expect(mintTabRenderJobIds(unset, 'room-a', 1)).rejects.toThrow()
	})
})
