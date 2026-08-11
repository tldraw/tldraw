import { beforeEach, describe, expect, it, vi } from 'vitest'

const authenticateRequest = vi.fn()
const getUser = vi.fn()

vi.mock('@clerk/backend', () => ({
	createClerkClient: () => ({
		authenticateRequest,
		users: { getUser },
	}),
}))

// Import after the mock is registered.
import { requireAdminAccessToRequest } from './getAuth'

const env = {
	CLERK_SECRET_KEY: 'sk',
	CLERK_PUBLISHABLE_KEY: 'pk',
} as any

function signedInAs(userId: string | null) {
	authenticateRequest.mockResolvedValue({
		isSignedIn: !!userId,
		toAuth: () => (userId ? { userId } : null),
	})
}

const request = {
	url: 'https://tldraw.com/',
	clone: () => request,
	headers: new Headers(),
} as any

describe('requireAdminAccessToRequest', () => {
	beforeEach(() => {
		authenticateRequest.mockReset()
		getUser.mockReset()
	})

	it('throws 401 when not signed in', async () => {
		signedInAs(null)
		await expect(requireAdminAccessToRequest(request, env)).rejects.toMatchObject({ status: 401 })
	})

	it('throws 403 for a non-staff email', async () => {
		signedInAs('user_1')
		getUser.mockResolvedValue({
			primaryEmailAddress: { emailAddress: 'jane@gmail.com', verification: { status: 'verified' } },
		})
		await expect(requireAdminAccessToRequest(request, env)).rejects.toMatchObject({ status: 403 })
	})

	it('throws 403 for an unverified @tldraw.com email', async () => {
		signedInAs('user_1')
		getUser.mockResolvedValue({
			primaryEmailAddress: {
				emailAddress: 'jane@tldraw.com',
				verification: { status: 'unverified' },
			},
		})
		await expect(requireAdminAccessToRequest(request, env)).rejects.toMatchObject({ status: 403 })
	})

	it('resolves for a verified @tldraw.com email', async () => {
		signedInAs('user_1')
		const user = {
			primaryEmailAddress: {
				emailAddress: 'jane@tldraw.com',
				verification: { status: 'verified' },
			},
		}
		getUser.mockResolvedValue(user)
		await expect(requireAdminAccessToRequest(request, env)).resolves.toBe(user)
	})
})
