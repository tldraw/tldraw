import { describe, expect, it, vi } from 'vitest'
import {
	getFriendsAndFamilyList,
	isOnFriendsAndFamilyList,
	parseFriendsAndFamilyEmails,
	setFriendsAndFamilyList,
} from './mcpFriendsAndFamily'

function makeEnv(stored: string | null = null) {
	return {
		FEATURE_FLAGS: {
			get: vi.fn(async () => stored),
			put: vi.fn(async () => {}),
		},
	} as any
}

describe('parseFriendsAndFamilyEmails', () => {
	it('splits on newlines and commas, trims, lowercases, and drops blanks', () => {
		expect(
			parseFriendsAndFamilyEmails(' Friend@Example.com \n\nother@example.com, third@x.co ')
		).toEqual(['friend@example.com', 'other@example.com', 'third@x.co'])
	})

	it('accepts an array as well as a block of text', () => {
		expect(parseFriendsAndFamilyEmails(['a@example.com', 'b@example.org'])).toEqual([
			'a@example.com',
			'b@example.org',
		])
	})

	it('drops duplicates that differ only in case or whitespace', () => {
		expect(parseFriendsAndFamilyEmails('a@example.com\nA@Example.com\n  a@example.com  ')).toEqual([
			'a@example.com',
		])
	})

	it('treats empty input as an empty list rather than an error', () => {
		expect(parseFriendsAndFamilyEmails('')).toEqual([])
		expect(parseFriendsAndFamilyEmails('\n\n,  ,\n')).toEqual([])
		expect(parseFriendsAndFamilyEmails(undefined)).toEqual([])
	})

	// Rejected before the lookup runs, so the admin gets "that isn't an email" rather than the
	// blanker "no account for that".
	it('rejects anything that is not an email address', () => {
		expect(() => parseFriendsAndFamilyEmails('tldraw.com')).toThrow('not an email address')
		// Bare domains are no longer a thing — every entry has to resolve to one account.
		expect(() => parseFriendsAndFamilyEmails('@tldraw.com')).toThrow('not an email address')
		expect(() => parseFriendsAndFamilyEmails('friend@localhost')).toThrow('not an email address')
		expect(() => parseFriendsAndFamilyEmails('a@b@example.com')).toThrow('not an email address')
		expect(() => parseFriendsAndFamilyEmails('friend @example.com')).toThrow('not an email address')
	})

	it('names the offending entry so the admin knows which line to fix', () => {
		expect(() => parseFriendsAndFamilyEmails('ok@example.com\ntldraw.com')).toThrow('"tldraw.com"')
	})
})

describe('isOnFriendsAndFamilyList', () => {
	const entries = [
		{ userId: 'user_1', email: 'friend@example.com' },
		{ userId: 'user_2', email: 'dev@tldraw.com' },
	]

	it('matches on user id', () => {
		expect(isOnFriendsAndFamilyList('user_1', entries)).toBe(true)
		expect(isOnFriendsAndFamilyList('user_2', entries)).toBe(true)
	})

	it('does not match an unlisted user id', () => {
		expect(isOnFriendsAndFamilyList('user_3', entries)).toBe(false)
	})

	// The stored email is a display label. Matching on it would reintroduce exactly the per-request
	// email lookup that storing ids exists to avoid.
	it('does not match on the stored email', () => {
		expect(isOnFriendsAndFamilyList('friend@example.com', entries)).toBe(false)
	})

	it('matches nobody for a missing user id or an empty list', () => {
		expect(isOnFriendsAndFamilyList(null, entries)).toBe(false)
		expect(isOnFriendsAndFamilyList('', entries)).toBe(false)
		expect(isOnFriendsAndFamilyList('user_1', [])).toBe(false)
	})
})

describe('getFriendsAndFamilyList', () => {
	it('returns an empty list when nothing is stored', async () => {
		expect(await getFriendsAndFamilyList(makeEnv(null))).toEqual([])
	})

	it('returns the stored entries', async () => {
		const stored = [{ userId: 'user_1', email: 'friend@example.com' }]
		expect(await getFriendsAndFamilyList(makeEnv(JSON.stringify(stored)))).toEqual(stored)
	})

	// An entry with no user id can never match, so it must not reach the request path.
	it('drops entries with no user id', async () => {
		const stored = [
			{ userId: 'user_1', email: 'friend@example.com' },
			{ email: 'orphan@example.com' },
			{ userId: '', email: 'blank@example.com' },
		]
		expect(await getFriendsAndFamilyList(makeEnv(JSON.stringify(stored)))).toEqual([
			{ userId: 'user_1', email: 'friend@example.com' },
		])
	})

	it('falls back to an empty list when the stored value is unreadable', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		expect(await getFriendsAndFamilyList(makeEnv('not json'))).toEqual([])
		expect(await getFriendsAndFamilyList(makeEnv(JSON.stringify({ nope: true })))).toEqual([])
		consoleSpy.mockRestore()
	})
})

describe('setFriendsAndFamilyList', () => {
	it('stores the entries as JSON under the friends and family key', async () => {
		const env = makeEnv()
		const entries = [{ userId: 'user_1', email: 'friend@example.com' }]
		await setFriendsAndFamilyList(env, entries)
		expect(env.FEATURE_FLAGS.put).toHaveBeenCalledWith(
			'mcp_friends_and_family_users',
			JSON.stringify(entries)
		)
	})
})
