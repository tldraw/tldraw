import { describe, expect, it } from 'vitest'
import { Environment } from './types'
import { loadVersionChainRollout, resolveVersionChainMode } from './versionChainConfig'

function env(partial: Partial<Environment>, kv?: string | null | Error): Environment {
	return {
		...partial,
		FEATURE_FLAGS: {
			get: async () => {
				if (kv instanceof Error) throw kv
				return kv ?? null
			},
		},
	} as unknown as Environment
}

async function mode(e: Environment, roomKey: string) {
	return resolveVersionChainMode(await loadVersionChainRollout(e), roomKey)
}

describe('version chain rollout', () => {
	it('is off when nothing is set', async () => {
		expect(await mode(env({}), 'app_rooms/a')).toBe('off')
	})

	it('is off for an unrecognised env value', async () => {
		expect(await mode(env({ VERSION_CHAIN_MODE: 'yes-please' }), 'app_rooms/a')).toBe('off')
	})

	it('applies the env mode to every room at 100 percent', async () => {
		const e = env({ VERSION_CHAIN_MODE: 'dual', VERSION_CHAIN_ROLLOUT_PERCENT: '100' })

		expect(await mode(e, 'app_rooms/a')).toBe('dual')
		expect(await mode(e, 'app_rooms/b')).toBe('dual')
	})

	it('defaults to 100 percent when the percentage is unset', async () => {
		expect(await mode(env({ VERSION_CHAIN_MODE: 'chain' }), 'app_rooms/a')).toBe('chain')
	})

	it('is off for every room at 0 percent', async () => {
		const e = env({ VERSION_CHAIN_MODE: 'dual', VERSION_CHAIN_ROLLOUT_PERCENT: '0' })

		expect(await mode(e, 'app_rooms/a')).toBe('off')
	})

	it('is stable for a given room', async () => {
		const e = env({ VERSION_CHAIN_MODE: 'dual', VERSION_CHAIN_ROLLOUT_PERCENT: '50' })

		expect(await mode(e, 'app_rooms/a')).toBe(await mode(e, 'app_rooms/a'))
	})

	it('splits rooms across the threshold', async () => {
		const rollout = await loadVersionChainRollout(
			env({ VERSION_CHAIN_MODE: 'dual', VERSION_CHAIN_ROLLOUT_PERCENT: '50' })
		)
		const rooms = Array.from({ length: 200 }, (_, i) => `app_rooms/room-${i}`)

		const on = rooms.filter((room) => resolveVersionChainMode(rollout, room) === 'dual').length

		expect(on).toBeGreaterThan(60)
		expect(on).toBeLessThan(140)
	})

	it('lets the KV override turn the mode on without a deploy', async () => {
		const e = env({}, '{"mode":"chain"}')

		expect(await mode(e, 'app_rooms/a')).toBe('chain')
	})

	it('lets the KV override kill an env-enabled mode', async () => {
		const e = env({ VERSION_CHAIN_MODE: 'dual' }, '{"mode":"off"}')

		expect(await mode(e, 'app_rooms/a')).toBe('off')
	})

	it('applies the KV percentage', async () => {
		const e = env({}, '{"mode":"dual","percent":0}')

		expect(await mode(e, 'app_rooms/a')).toBe('off')
	})

	it('falls back to the env vars for a malformed override', async () => {
		for (const kv of ['not json', '{"mode":"sideways"}', '{"mode":"dual","percent":"lots"}']) {
			expect(await mode(env({ VERSION_CHAIN_MODE: 'dual' }, kv), 'app_rooms/a')).toBe('dual')
			expect(await mode(env({}, kv), 'app_rooms/a')).toBe('off')
		}
	})

	it('falls back to the env vars when the KV read throws', async () => {
		const e = env({ VERSION_CHAIN_MODE: 'dual' }, new Error('KV is down'))

		expect(await mode(e, 'app_rooms/a')).toBe('dual')
	})
})
