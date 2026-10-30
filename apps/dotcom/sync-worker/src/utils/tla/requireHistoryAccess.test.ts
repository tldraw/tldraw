import { StatusError } from 'itty-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Environment } from '../../types'
import { requireHistoryAccess } from './requireHistoryAccess'

vi.mock('../../postgres', () => ({ createPostgresConnectionPool: vi.fn() }))
vi.mock('./getAuth', () => ({ requireAuth: vi.fn(), requireAdminAccess: vi.fn() }))
vi.mock('./hasWriteAccessToFile', () => ({ hasWriteAccessToFile: vi.fn() }))

const { createPostgresConnectionPool } = await import('../../postgres')
const { requireAuth, requireAdminAccess } = await import('./getAuth')
const { hasWriteAccessToFile } = await import('./hasWriteAccessToFile')

const env = {} as Environment
const request = {} as any
const destroy = vi.fn(async () => {})
const db = { destroy }

function signedInAs(userId: string | null) {
	if (userId) {
		vi.mocked(requireAuth).mockResolvedValue({ userId } as any)
	} else {
		vi.mocked(requireAuth).mockRejectedValue(new StatusError(401, 'Unauthorized'))
	}
}

function canEdit(value: boolean) {
	vi.mocked(hasWriteAccessToFile).mockResolvedValue(value)
}

function isStaff(value: boolean) {
	if (value) vi.mocked(requireAdminAccess).mockResolvedValue({} as any)
	else vi.mocked(requireAdminAccess).mockRejectedValue(new StatusError(403, 'Unauthorized'))
}

beforeEach(() => {
	vi.mocked(createPostgresConnectionPool).mockReturnValue(db as any)
})
afterEach(() => vi.clearAllMocks())

describe('requireHistoryAccess for app files', () => {
	it('lets a user who can edit the file in', async () => {
		signedInAs('user-1')
		canEdit(true)
		isStaff(false)

		await expect(requireHistoryAccess(request, env, 'file-1', true)).resolves.toBeUndefined()
		expect(hasWriteAccessToFile).toHaveBeenCalledWith(db, 'file-1', 'user-1')
		expect(destroy).toHaveBeenCalled()
	})

	it('lets staff into a file they cannot edit', async () => {
		signedInAs('staff-1')
		canEdit(false)
		isStaff(true)

		await expect(requireHistoryAccess(request, env, 'file-1', true)).resolves.toBeUndefined()
	})

	it('refuses a signed-in user who cannot edit the file', async () => {
		signedInAs('user-1')
		canEdit(false)
		isStaff(false)

		await expect(requireHistoryAccess(request, env, 'file-1', true)).rejects.toMatchObject({
			status: 403,
		})
		expect(destroy).toHaveBeenCalled()
	})

	it('keeps raw versions staff-only, even for editors', async () => {
		signedInAs('user-1')
		canEdit(true)
		isStaff(false)

		await expect(
			requireHistoryAccess(request, env, 'file-1', true, { raw: true })
		).rejects.toMatchObject({ status: 403 })
	})

	// An edit link grants write access to anyone, signed in or not. History still needs a sign-in.
	it('refuses a signed-out visitor before checking the file', async () => {
		signedInAs(null)
		canEdit(true)

		await expect(requireHistoryAccess(request, env, 'file-1', true)).rejects.toMatchObject({
			status: 401,
		})
		expect(hasWriteAccessToFile).not.toHaveBeenCalled()
	})
})

// Legacy rooms have no owner, so there is nobody but staff to let in.
describe('requireHistoryAccess for legacy rooms', () => {
	it('lets staff in', async () => {
		signedInAs('staff-1')
		isStaff(true)

		await expect(requireHistoryAccess(request, env, 'room-1', false)).resolves.toBeUndefined()
		expect(hasWriteAccessToFile).not.toHaveBeenCalled()
	})

	it('refuses everyone else', async () => {
		signedInAs('user-1')
		isStaff(false)

		await expect(requireHistoryAccess(request, env, 'room-1', false)).rejects.toMatchObject({
			status: 403,
		})
		expect(hasWriteAccessToFile).not.toHaveBeenCalled()
	})
})
