import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	evaluateFlagForUser,
	getAllFeatureFlagValues,
	getFeatureFlagValue,
	getFeatureFlags,
	hashToPercentage,
	parseAllowlistEmails,
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
			buckets.add(hashToPercentage(`user-${i}`, 'some_flag'))
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
					'some_flag',
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
					'some_flag',
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
					'some_flag',
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
		const flag = 'some_flag'
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

// The type a percentage rollout cannot stand in for: a percentage buckets users by hash, so it gives
// you *a* subset of the right size but never *the* subset you picked.
describe('evaluateFlagForUser (allowlist)', () => {
	const flag = (userIds: string[], enabled = true) =>
		({
			type: 'allowlist',
			enabled,
			users: userIds.map((userId) => ({ userId, email: `${userId}@example.com` })),
			description: '',
		}) as const

	it('is on only for the named users', () => {
		expect(evaluateFlagForUser(flag(['user-1', 'user-2']), 'test', 'user-1')).toBe(true)
		expect(evaluateFlagForUser(flag(['user-1', 'user-2']), 'test', 'user-2')).toBe(true)
		expect(evaluateFlagForUser(flag(['user-1', 'user-2']), 'test', 'user-3')).toBe(false)
	})

	it('is off for everyone when the master toggle is off', () => {
		expect(evaluateFlagForUser(flag(['user-1'], false), 'test', 'user-1')).toBe(false)
	})

	it('is off for an anonymous caller', () => {
		expect(evaluateFlagForUser(flag(['user-1']), 'test', null)).toBe(false)
	})

	it('is off for an empty list', () => {
		expect(evaluateFlagForUser(flag([]), 'test', 'user-1')).toBe(false)
	})

	// The value comes from KV, where a hand-edited entry can arrive as anything. A malformed list must
	// deny rather than admit — the alternative fails open on a flag whose whole job is to keep people
	// out.
	it('denies when users is missing or not an array of entries', () => {
		expect(
			evaluateFlagForUser({ type: 'allowlist', enabled: true, description: '' } as any, 't', 'u')
		).toBe(false)
		expect(
			evaluateFlagForUser(
				{ type: 'allowlist', enabled: true, users: 'user-1', description: '' } as any,
				't',
				'u'
			)
		).toBe(false)
		expect(
			evaluateFlagForUser(
				{ type: 'allowlist', enabled: true, users: ['user-1'], description: '' } as any,
				't',
				'user-1'
			)
		).toBe(false)
	})
})

// The admin edits an allowlist as emails; this is the input half of that. Resolution to user ids
// happens against the database in the admin route.
describe('parseAllowlistEmails', () => {
	it('splits on newlines and commas, trims, lowercases, and drops blanks', () => {
		expect(parseAllowlistEmails(' Friend@Example.com \n\nother@example.com, third@x.co ')).toEqual([
			'friend@example.com',
			'other@example.com',
			'third@x.co',
		])
	})

	it('accepts an array as well as a block of text', () => {
		expect(parseAllowlistEmails(['a@example.com', 'b@example.org'])).toEqual([
			'a@example.com',
			'b@example.org',
		])
	})

	it('drops duplicates that differ only in case or whitespace', () => {
		expect(parseAllowlistEmails('a@example.com\nA@Example.com\n  a@example.com  ')).toEqual([
			'a@example.com',
		])
	})

	it('treats empty input as an empty list rather than an error', () => {
		expect(parseAllowlistEmails('')).toEqual([])
		expect(parseAllowlistEmails('\n\n,  ,\n')).toEqual([])
		expect(parseAllowlistEmails(undefined)).toEqual([])
	})

	// Rejected before the lookup runs, so the admin gets "that isn't an email" rather than the
	// blanker "no account for that".
	it('rejects anything that is not an email address', () => {
		expect(() => parseAllowlistEmails('tldraw.com')).toThrow('not an email address')
		expect(() => parseAllowlistEmails('@tldraw.com')).toThrow('not an email address')
		expect(() => parseAllowlistEmails('friend@localhost')).toThrow('not an email address')
		expect(() => parseAllowlistEmails('a@b@example.com')).toThrow('not an email address')
		expect(() => parseAllowlistEmails('friend @example.com')).toThrow('not an email address')
	})

	it('names the offending entry so the admin knows which line to fix', () => {
		expect(() => parseAllowlistEmails('ok@example.com\ntldraw.com')).toThrow('"tldraw.com"')
	})
})

describe('getFeatureFlagValue', () => {
	it('returns defaults when KV has no value', async () => {
		const env = makeEnv()
		const value = await getFeatureFlagValue(env as any, 'rum_enabled')
		expect(value).toMatchObject({ type: 'percentage', enabled: false, percentage: 0 })
	})

	it('merges KV value over defaults', async () => {
		const env = makeEnv({
			rum_enabled: JSON.stringify({ enabled: true, percentage: 25 }),
		})
		const value = await getFeatureFlagValue(env as any, 'rum_enabled')
		expect(value).toMatchObject({
			type: 'percentage',
			enabled: true,
			percentage: 25,
		})
		// Description should come from defaults
		expect(value.description).toBeTruthy()
	})

	// The defaults table is the schema and KV holds only state, so a stored `type` never gets a say.
	// `"allowList"` — a capital L — used to reach evaluateFlagForUser as a type none of its arms
	// matched, and the fall-through admitted everyone holding any token.
	it('discards a stored type that disagrees with the default', async () => {
		const env = makeEnv({
			mcp_server_access: JSON.stringify({ type: 'allowList', enabled: true }),
		})
		const value = await getFeatureFlagValue(env as any, 'mcp_server_access')
		expect(value.type).toBe('allowlist')
		expect(evaluateFlagForUser(value, 'mcp_server_access', 'user-1')).toBe(false)
	})

	it('returns defaults on KV error', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		const env = makeEnv()
		env.FEATURE_FLAGS.get = vi.fn(async () => {
			throw new Error('KV down')
		})
		const value = await getFeatureFlagValue(env as any, 'rum_enabled')
		expect(value).toMatchObject({ type: 'percentage', enabled: false })
		consoleSpy.mockRestore()
	})
})

describe('setFeatureFlag', () => {
	it('updates enabled', async () => {
		const env = makeEnv()
		await setFeatureFlag(env as any, 'rum_enabled', { type: 'percentage', enabled: true })
		expect(env.FEATURE_FLAGS.put).toHaveBeenCalledWith(
			'rum_enabled',
			expect.stringContaining('"enabled":true')
		)
	})

	it('updates percentage', async () => {
		const env = makeEnv()
		await setFeatureFlag(env as any, 'rum_enabled', { type: 'percentage', percentage: 42 })
		const putCall = env.FEATURE_FLAGS.put.mock.calls[0]
		const stored = JSON.parse(putCall[1])
		expect(stored.percentage).toBe(42)
	})

	// Replaced rather than merged, so removing someone is an ordinary save.
	it('replaces the allowlist wholesale', async () => {
		const env = makeEnv({
			mcp_server_access: JSON.stringify({
				type: 'allowlist',
				enabled: true,
				users: [
					{ userId: 'user-1', email: 'one@example.com' },
					{ userId: 'user-2', email: 'two@example.com' },
				],
			}),
		})
		await setFeatureFlag(env as any, 'mcp_server_access', {
			type: 'allowlist',
			users: [{ userId: 'user-2', email: 'two@example.com' }],
		})
		expect(JSON.parse(env.FEATURE_FLAGS.put.mock.calls[0][1]).users).toEqual([
			{ userId: 'user-2', email: 'two@example.com' },
		])
	})

	// A field that means nothing for this flag's type is refused rather than dropped. It used to be
	// dropped in silence, and the admin route still answered `{success: true, users: […]}` — so an
	// allowlist sent to a percentage flag reported a save that stored nothing anywhere.
	it('refuses an update naming a different type than the flag', async () => {
		const env = makeEnv()
		await expect(
			setFeatureFlag(env as any, 'rum_enabled', {
				type: 'allowlist',
				users: [{ userId: 'user-1', email: 'one@example.com' }],
			})
		).rejects.toThrow('is a percentage flag')
		expect(env.FEATURE_FLAGS.put).not.toHaveBeenCalled()
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
			rum_enabled: JSON.stringify({ enabled: true, percentage: 100 }),
		})
		const response = await getFeatureFlags({} as any, env as any)
		const body: any = await response.json()

		expect(response.headers.get('x-authenticated')).toBe('1')
		// percentage 100 includes every userId
		expect(body.rum_enabled.enabled).toBe(true)
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
			rum_enabled: JSON.stringify({ enabled: true, percentage: 100 }),
		})
		const response = await getFeatureFlags({} as any, env as any)
		const body: any = await response.json()

		// Percentage flags require a userId
		expect(body.rum_enabled.enabled).toBe(false)
	})

	it('forces legacy zero_enabled/zero_kill_switch flags on for old client bundles, even unauthenticated', async () => {
		const { getAuth } = await import('./tla/getAuth')
		vi.mocked(getAuth).mockResolvedValue(null)

		const env = makeEnv()
		const response = await getFeatureFlags({} as any, env as any)
		const body: any = await response.json()

		expect(body.zero_enabled.enabled).toBe(true)
		expect(body.zero_kill_switch.enabled).toBe(false)
		expect(body.rum_enabled).toBeDefined()
	})
})

describe('getAllFeatureFlagValues', () => {
	it('returns raw flag values including percentage and description', async () => {
		const env = makeEnv({
			rum_enabled: JSON.stringify({ enabled: true, percentage: 30 }),
		})
		const flags = await getAllFeatureFlagValues(env as any)

		expect(flags.rum_enabled).toMatchObject({
			type: 'percentage',
			enabled: true,
			percentage: 30,
		})
		expect(flags.rum_enabled.description).toBeTruthy()
	})

	it('returns all flags even when KV is empty', async () => {
		const env = makeEnv()
		const flags = await getAllFeatureFlagValues(env as any)

		expect(Object.keys(flags).sort()).toEqual([
			'commenting_enabled',
			'mcp_server_access',
			'rum_enabled',
		])
	})
})
