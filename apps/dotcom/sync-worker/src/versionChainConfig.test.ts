import { describe, expect, it } from 'vitest'
import { Environment } from './types'
import { loadVersionChainRollout, resolveVersionChainMode } from './versionChainConfig'

function env(tldrawEnv?: string, kv?: Record<string, string>): Environment {
	return {
		TLDRAW_ENV: tldrawEnv,
		FEATURE_FLAGS: {
			get: async (key: string) => kv?.[key] ?? null,
		},
	} as unknown as Environment
}

async function mode(e: Environment, roomKey: string) {
	return resolveVersionChainMode(await loadVersionChainRollout(e), roomKey)
}

describe('version chain rollout', () => {
	it('defaults to chain everywhere, production included', async () => {
		for (const tldrawEnv of ['development', 'staging', 'production', undefined]) {
			expect(await mode(env(tldrawEnv), 'app_rooms/a')).toBe('chain')
		}
	})

	it('is off when the chain flag is disabled', async () => {
		const e = env('production', { version_chain: '{"enabled":false}' })

		expect(await mode(e, 'app_rooms/a')).toBe('off')
	})

	it('is stable for a given room', async () => {
		const e = env('staging', { version_chain: '{"enabled":true,"percentage":50}' })

		expect(await mode(e, 'app_rooms/a')).toBe(await mode(e, 'app_rooms/a'))
	})

	it('splits rooms across the percentage threshold', async () => {
		const rollout = await loadVersionChainRollout(
			env('staging', { version_chain: '{"enabled":true,"percentage":50}' })
		)
		const rooms = Array.from({ length: 200 }, (_, i) => `app_rooms/room-${i}`)

		const on = rooms.filter((room) => resolveVersionChainMode(rollout, room) === 'chain').length

		expect(on).toBeGreaterThan(60)
		expect(on).toBeLessThan(140)
	})
})
