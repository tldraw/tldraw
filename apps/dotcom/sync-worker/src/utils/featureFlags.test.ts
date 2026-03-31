import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	evaluateFlagForUser,
	getFeatureFlagEnabled,
	getFeatureFlagValue,
	getFeatureFlags,
	getFeatureFlagsAdmin,
	hashToPercentage,
	setFeatureFlag,
} from './featureFlags'

vi.mock('./tla/getAuth', () => ({
	getAuth: vi.fn(),
}))

function makeEnv(
	kvData: Record<string, string> = {},
	tldrawEnv = 'production'
): { FEATURE_FLAGS: any; TLDRAW_ENV: string } {
	return {
		TLDRAW_ENV: tldrawEnv,
		FEATURE_FLAGS: {
			get: vi.fn(async (key: string) => kvData[key] ?? null),
			put: vi.fn(async () => {}),
		},
	}
}

describe('hashToPercentage', () => {
	it('returns a number between 0 and 99 inclusive', () => {
		for (let i = 0; i < 200; i++) {
			const result = hashToPercentage(`user-${i}`, 'some_flag')
			expect(result).toBeGreaterThanOrEqual(0)
			expect(result).toBeLessThanOrEqual(99)
		}
	})

	it('produces a reasonable spread across buckets', () => {
		const buckets = new Set<number>()
		for (let i = 0; i < 100; i++) {
			buckets.add(hashToPercentage(`user-${i}`, 'zero_enabled'))
		}
		expect(buckets.size).toBeGreaterThan(10)
	})
})

describe('evaluateFlagForUser', () => {
	it('returns false when flag is disabled regardless of type', () => {
		expect(
			evaluateFlagForUser({ type: 'boolean', enabled: false, description: '' }, 'test', 'user-1')
		).toBe(false)

		expect(
			evaluateFlagForUser(
				{ type: 'percentage', enabled: false, percentage: 100, description: '' },
				'test',
				'user-1'
			)
		).toBe(false)
	})

	it('returns true for enabled boolean flags', () => {
		expect(
			evaluateFlagForUser({ type: 'boolean', enabled: true, description: '' }, 'test', 'user-1')
		).toBe(true)
	})

	it('returns true for enabled boolean flags even without userId', () => {
		expect(
			evaluateFlagForUser({ type: 'boolean', enabled: true, description: '' }, 'test', null)
		).toBe(true)
	})

	it('returns false for percentage flags when userId is null', () => {
		expect(
			evaluateFlagForUser(
				{ type: 'percentage', enabled: true, percentage: 100, description: '' },
				'test',
				null
			)
		).toBe(false)
	})

	it('returns true for percentage 100 (all users)', () => {
		// 100% should include everyone since hash produces 0-99
		for (let i = 0; i < 50; i++) {
			expect(
				evaluateFlagForUser(
					{ type: 'percentage', enabled: true, percentage: 100, description: '' },
					'zero_enabled',
					`user-${i}`
				)
			).toBe(true)
		}
	})

	it('returns false for percentage 0 (no users)', () => {
		for (let i = 0; i < 50; i++) {
			expect(
				evaluateFlagForUser(
					{ type: 'percentage', enabled: true, percentage: 0, description: '' },
					'zero_enabled',
					`user-${i}`
				)
			).toBe(false)
		}
	})

	it('includes a subset of users for intermediate percentages', () => {
		let included = 0
		const total = 1000
		for (let i = 0; i < total; i++) {
			if (
				evaluateFlagForUser(
					{ type: 'percentage', enabled: true, percentage: 50, description: '' },
					'zero_enabled',
					`user-${i}`
				)
			) {
				included++
			}
		}
		// Should be roughly 50% — allow wide margin for hash distribution
		expect(included).toBeGreaterThan(total * 0.3)
		expect(included).toBeLessThan(total * 0.7)
	})

	it('rollout is monotonic: increasing percentage never removes existing users', () => {
		const flag = 'zero_enabled'
		const users = Array.from({ length: 200 }, (_, i) => `user-${i}`)
		const makeFlag = (pct: number) =>
			({ type: 'percentage', enabled: true, percentage: pct, description: '' }) as const

		const at10 = new Set(users.filter((u) => evaluateFlagForUser(makeFlag(10), flag, u)))
		const at25 = new Set(users.filter((u) => evaluateFlagForUser(makeFlag(25), flag, u)))
		const at50 = new Set(users.filter((u) => evaluateFlagForUser(makeFlag(50), flag, u)))
		const at100 = new Set(users.filter((u) => evaluateFlagForUser(makeFlag(100), flag, u)))

		// Every user in a smaller bucket must also be in every larger bucket
		for (const u of at10) expect(at25.has(u)).toBe(true)
		for (const u of at25) expect(at50.has(u)).toBe(true)
		for (const u of at50) expect(at100.has(u)).toBe(true)
	})
})

describe('getFeatureFlagValue', () => {
	it('returns defaults when KV has no value', async () => {
		const env = makeEnv()
		const value = await getFeatureFlagValue(env as any, 'zero_kill_switch')
		expect(value).toMatchObject({ type: 'boolean', enabled: false })
	})

	it('merges KV value over defaults', async () => {
		const env = makeEnv({
			zero_enabled: JSON.stringify({ enabled: true, percentage: 25 }),
		})
		const value = await getFeatureFlagValue(env as any, 'zero_enabled')
		expect(value).toMatchObject({
			type: 'percentage',
			enabled: true,
			percentage: 25,
		})
		// Description should come from defaults
		expect(value.description).toBeTruthy()
	})

	it('returns defaults on KV error', async () => {
		const env = makeEnv()
		env.FEATURE_FLAGS.get = vi.fn(async () => {
			throw new Error('KV down')
		})
		const value = await getFeatureFlagValue(env as any, 'zero_kill_switch')
		expect(value).toMatchObject({ type: 'boolean', enabled: false })
	})
})

describe('setFeatureFlag', () => {
	it('updates enabled on a boolean flag', async () => {
		const env = makeEnv()
		await setFeatureFlag(env as any, 'zero_kill_switch', { enabled: true })
		expect(env.FEATURE_FLAGS.put).toHaveBeenCalledWith(
			'zero_kill_switch',
			expect.stringContaining('"enabled":true')
		)
	})

	it('updates percentage on a percentage flag', async () => {
		const env = makeEnv()
		await setFeatureFlag(env as any, 'zero_enabled', { percentage: 42 })
		const putCall = env.FEATURE_FLAGS.put.mock.calls[0]
		const stored = JSON.parse(putCall[1])
		expect(stored.percentage).toBe(42)
	})

	it('ignores percentage on a boolean flag', async () => {
		const env = makeEnv()
		await setFeatureFlag(env as any, 'zero_kill_switch', { percentage: 50 })
		const putCall = env.FEATURE_FLAGS.put.mock.calls[0]
		const stored = JSON.parse(putCall[1])
		expect(stored.percentage).toBeUndefined()
	})
})

describe('getFeatureFlags (route handler)', () => {
	beforeEach(async () => {
		const { getAuth } = await import('./tla/getAuth')
		vi.mocked(getAuth).mockReset()
	})

	it('returns evaluated flags with x-authenticated header for authenticated user', async () => {
		const { getAuth } = await import('./tla/getAuth')
		vi.mocked(getAuth).mockResolvedValue({ userId: 'user-abc' } as any)

		const env = makeEnv({
			zero_kill_switch: JSON.stringify({ enabled: true }),
		})
		const response = await getFeatureFlags({} as any, env as any)
		const body: any = await response.json()

		expect(response.headers.get('x-authenticated')).toBe('1')
		// kill switch is a boolean flag, enabled=true → evaluates to true
		expect(body.zero_kill_switch.enabled).toBe(true)
	})

	it('returns x-authenticated=0 for unauthenticated user', async () => {
		const { getAuth } = await import('./tla/getAuth')
		vi.mocked(getAuth).mockResolvedValue(null)

		const env = makeEnv()
		const response = await getFeatureFlags({} as any, env as any)

		expect(response.headers.get('x-authenticated')).toBe('0')
	})

	it('returns false for percentage flags when not authenticated', async () => {
		const { getAuth } = await import('./tla/getAuth')
		vi.mocked(getAuth).mockResolvedValue(null)

		const env = makeEnv({
			zero_enabled: JSON.stringify({ enabled: true, percentage: 100 }),
		})
		const response = await getFeatureFlags({} as any, env as any)
		const body: any = await response.json()

		// Percentage flags require a userId
		expect(body.zero_enabled.enabled).toBe(false)
	})
})

describe('getFeatureFlagEnabled', () => {
	it('returns the enabled field for a boolean flag', async () => {
		const env = makeEnv({ zero_kill_switch: JSON.stringify({ enabled: true }) })
		expect(await getFeatureFlagEnabled(env as any, 'zero_kill_switch')).toBe(true)
	})

	it('returns the master toggle for a percentage flag (ignores per-user rollout)', async () => {
		const env = makeEnv({
			zero_enabled: JSON.stringify({ enabled: true, percentage: 0 }),
		})
		// enabled=true even though percentage=0 would exclude all users
		expect(await getFeatureFlagEnabled(env as any, 'zero_enabled')).toBe(true)
	})
})

describe('getFeatureFlagsAdmin (route handler)', () => {
	it('returns raw flag values including percentage and description', async () => {
		const env = makeEnv({
			zero_enabled: JSON.stringify({ enabled: true, percentage: 30 }),
		})
		const response = await getFeatureFlagsAdmin({} as any, env as any)
		const body: any = await response.json()

		expect(body.zero_enabled.percentage).toBe(30)
		expect(body.zero_enabled.enabled).toBe(true)
		expect(body.zero_enabled.type).toBe('percentage')
		expect(body.zero_enabled.description).toBeTruthy()
	})

	it('returns all flags even when KV is empty', async () => {
		const env = makeEnv()
		const response = await getFeatureFlagsAdmin({} as any, env as any)
		const body: any = await response.json()

		expect(Object.keys(body).sort()).toEqual(['zero_enabled', 'zero_kill_switch'].sort())
	})
})
