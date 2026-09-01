import { describe, expect, it } from 'vitest'
import { Environment } from './types'
import { getVersionChainMode } from './versionChainConfig'

function env(partial: Partial<Environment>): Environment {
	return partial as Environment
}

describe('getVersionChainMode', () => {
	it('is off when unset', () => {
		expect(getVersionChainMode(env({}), 'app_rooms/a')).toBe('off')
	})

	it('is off for an unrecognised value', () => {
		expect(getVersionChainMode(env({ VERSION_CHAIN_MODE: 'yes-please' }), 'app_rooms/a')).toBe(
			'off'
		)
	})

	it('applies the mode to every room at 100 percent', () => {
		const e = env({ VERSION_CHAIN_MODE: 'dual', VERSION_CHAIN_ROLLOUT_PERCENT: '100' })

		expect(getVersionChainMode(e, 'app_rooms/a')).toBe('dual')
		expect(getVersionChainMode(e, 'app_rooms/b')).toBe('dual')
	})

	it('defaults to 100 percent when the percentage is unset', () => {
		expect(getVersionChainMode(env({ VERSION_CHAIN_MODE: 'chain' }), 'app_rooms/a')).toBe('chain')
	})

	it('is off for every room at 0 percent', () => {
		const e = env({ VERSION_CHAIN_MODE: 'dual', VERSION_CHAIN_ROLLOUT_PERCENT: '0' })

		expect(getVersionChainMode(e, 'app_rooms/a')).toBe('off')
	})

	it('is stable for a given room', () => {
		const e = env({ VERSION_CHAIN_MODE: 'dual', VERSION_CHAIN_ROLLOUT_PERCENT: '50' })

		expect(getVersionChainMode(e, 'app_rooms/a')).toBe(getVersionChainMode(e, 'app_rooms/a'))
	})

	it('splits rooms across the threshold', () => {
		const e = env({ VERSION_CHAIN_MODE: 'dual', VERSION_CHAIN_ROLLOUT_PERCENT: '50' })
		const rooms = Array.from({ length: 200 }, (_, i) => `app_rooms/room-${i}`)

		const on = rooms.filter((room) => getVersionChainMode(e, room) === 'dual').length

		expect(on).toBeGreaterThan(60)
		expect(on).toBeLessThan(140)
	})
})
