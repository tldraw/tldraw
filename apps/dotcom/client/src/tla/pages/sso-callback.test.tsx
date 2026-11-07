import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { Component as SsoCallback } from './sso-callback'

const handleRedirectCallback = vi.fn()
const navigate = vi.fn()
const captureException = vi.fn()

vi.mock('@clerk/react', () => ({
	useClerk: () => ({ handleRedirectCallback }),
	useAuth: () => ({ isLoaded: true }),
}))
vi.mock('@sentry/react', () => ({ captureException: (e: unknown) => captureException(e) }))
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }))

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

async function render() {
	const root = createRoot(document.createElement('div'))
	await act(async () => root.render(<SsoCallback />))
	root.unmount()
}

describe('sso-callback', () => {
	beforeEach(() => vi.clearAllMocks())

	it('reports a failed callback and reopens sign-in instead of leaving a blank page', async () => {
		const err = new Error('callback failed')
		handleRedirectCallback.mockRejectedValue(err)
		await render()
		expect(captureException).toHaveBeenCalledWith(err)
		expect(navigate).toHaveBeenCalledWith('/', { replace: true, state: { openSignIn: true } })
	})

	it('leaves navigation to Clerk when the callback succeeds', async () => {
		handleRedirectCallback.mockResolvedValue(undefined)
		await render()
		expect(navigate).not.toHaveBeenCalled()
		expect(captureException).not.toHaveBeenCalled()
	})
})
