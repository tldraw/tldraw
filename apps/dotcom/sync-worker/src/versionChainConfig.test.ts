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
	it('defaults to dual everywhere outside production', async () => {
		expect(await mode(env('development'), 'app_rooms/a')).toBe('dual')
		expect(await mode(env('staging'), 'app_rooms/a')).toBe('dual')
		expect(await mode(env(undefined), 'app_rooms/a')).toBe('dual')
	})

	it('defaults to off in production', async () => {
		expect(await mode(env('production'), 'app_rooms/a')).toBe('off')
	})

	it('is off when the chain flag is disabled', async () => {
		const e = env('staging', { version_chain: '{"enabled":false}' })

		expect(await mode(e, 'app_rooms/a')).toBe('off')
	})

	it('is chain when legacy writes are disabled for a room on chains', async () => {
		const e = env('staging', { version_chain_legacy_writes: '{"enabled":false}' })

		expect(await mode(e, 'app_rooms/a')).toBe('chain')
	})

	it('never leaves a room writing nothing: outside the chain rollout, legacy always wins', async () => {
		// The dangerous flag state — legacy writes disabled while the chain rollout does not cover the
		// room — must degrade to legacy-only, not to no version writes at all.
		const e = env('staging', {
			version_chain: '{"enabled":true,"percentage":0}',
			version_chain_legacy_writes: '{"enabled":false}',
		})

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

		const on = rooms.filter((room) => resolveVersionChainMode(rollout, room) === 'dual').length

		expect(on).toBeGreaterThan(60)
		expect(on).toBeLessThan(140)
	})

	it('lets a stored flag turn production on without a deploy', async () => {
		const e = env('production', { version_chain: '{"enabled":true,"percentage":100}' })

		expect(await mode(e, 'app_rooms/a')).toBe('dual')
	})
})
