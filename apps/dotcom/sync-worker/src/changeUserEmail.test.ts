import { StatusError } from 'itty-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { changeUserEmail } from './changeUserEmail'
import { Environment } from './types'

vi.mock('./postgres', () => ({ createPostgresConnectionPool: vi.fn() }))
vi.mock('./utils/tla/getAuth', () => ({ getClerkClient: vi.fn() }))

const { createPostgresConnectionPool } = await import('./postgres')
const { getClerkClient } = await import('./utils/tla/getAuth')

const env = {} as Environment

let takenBy: { id: string } | undefined
let dbUpdates: Array<{ set: unknown; userId: unknown }>

function mockDb() {
	dbUpdates = []
	vi.mocked(createPostgresConnectionPool).mockReturnValue({
		selectFrom: () => ({
			select: () => ({
				where: () => ({ where: () => ({ executeTakeFirst: async () => takenBy }) }),
			}),
		}),
		updateTable: () => ({
			set: (set: unknown) => ({
				where: (_col: string, _op: string, userId: unknown) => ({
					execute: async () => void dbUpdates.push({ set, userId }),
				}),
			}),
		}),
		destroy: async () => {},
	} as any)
}

function address(id: string, emailAddress: string, linked = false) {
	return { id, emailAddress, linkedTo: linked ? [{ id: 'idn_1', type: 'oauth_google' }] : [] }
}

function mockClerk(emailAddresses: ReturnType<typeof address>[]) {
	const clerk = {
		users: { getUser: vi.fn(async () => ({ emailAddresses })) },
		emailAddresses: {
			createEmailAddress: vi.fn(async (p: { emailAddress: string }) =>
				address('idn_new', p.emailAddress)
			),
			updateEmailAddress: vi.fn(async (id: string) => emailAddresses.find((a) => a.id === id)!),
			deleteEmailAddress: vi.fn(async () => ({})),
		},
	}
	vi.mocked(getClerkClient).mockReturnValue(clerk as any)
	return clerk
}

beforeEach(() => {
	vi.clearAllMocks()
	takenBy = undefined
	mockDb()
})

describe('changeUserEmail', () => {
	it('makes the new address the verified primary and updates the user row', async () => {
		const clerk = mockClerk([address('idn_old', 'old@example.com')])

		const result = await changeUserEmail(env, 'user_1', ' new@example.com ')

		expect(clerk.emailAddresses.createEmailAddress).toHaveBeenCalledWith({
			userId: 'user_1',
			emailAddress: 'new@example.com',
			verified: true,
			primary: true,
		})
		expect(clerk.emailAddresses.deleteEmailAddress).toHaveBeenCalledWith('idn_old')
		expect(dbUpdates).toEqual([
			{ set: { email: 'new@example.com', updatedAt: expect.any(Number) }, userId: 'user_1' },
		])
		expect(result).toEqual({
			email: 'new@example.com',
			removed: ['old@example.com'],
			keptLinked: [],
		})
	})

	it('keeps old addresses a social login is linked to', async () => {
		const clerk = mockClerk([address('idn_google', 'old@gmail.com', true)])

		const result = await changeUserEmail(env, 'user_1', 'new@example.com')

		expect(clerk.emailAddresses.deleteEmailAddress).not.toHaveBeenCalled()
		expect(result.keptLinked).toEqual(['old@gmail.com'])
	})

	it('promotes an address the user already has instead of adding it again', async () => {
		const clerk = mockClerk([
			address('idn_old', 'old@example.com'),
			address('idn_second', 'New@example.com'),
		])

		await changeUserEmail(env, 'user_1', 'new@example.com')

		expect(clerk.emailAddresses.createEmailAddress).not.toHaveBeenCalled()
		expect(clerk.emailAddresses.updateEmailAddress).toHaveBeenCalledWith('idn_second', {
			verified: true,
			primary: true,
		})
		expect(clerk.emailAddresses.deleteEmailAddress).toHaveBeenCalledWith('idn_old')
	})

	it('refuses an email another account has, before touching Clerk', async () => {
		takenBy = { id: 'user_2' }
		const clerk = mockClerk([address('idn_old', 'old@example.com')])

		await expect(changeUserEmail(env, 'user_1', 'new@example.com')).rejects.toMatchObject({
			status: 409,
		})
		expect(clerk.users.getUser).not.toHaveBeenCalled()
		expect(dbUpdates).toEqual([])
	})

	it('refuses something that is not an email', async () => {
		await expect(changeUserEmail(env, 'user_1', 'nope')).rejects.toBeInstanceOf(StatusError)
	})
})
