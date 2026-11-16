import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { deleteFromSessionStorage, getFromSessionStorage, setInSessionStorage } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SESSION_STORAGE_KEYS } from '../utils/session-storage'
import { WorkspaceInviteHandler } from './WorkspaceInviteHandler'

const addToast = vi.fn()
const addDialog = vi.fn()

vi.mock('@clerk/react', () => ({
	useAuth: () => ({ isLoaded: true, isSignedIn: true, userId: 'user_1' }),
	useUser: () => ({ user: { legalAcceptedAt: new Date() } }),
}))

let location = { pathname: '/', search: '', key: 'default' }

vi.mock('react-router-dom', () => ({
	// A new object on every render, like a navigation.
	useLocation: () => ({ ...location }),
	useSearchParams: () => [new URLSearchParams(location.search), vi.fn()],
}))

vi.mock('../hooks/useAppState', () => ({
	useMaybeApp: () => ({ getWorkspaceMembership: () => undefined }),
}))

vi.mock('tldraw', async (importOriginal) => ({
	...(await importOriginal<typeof import('tldraw')>()),
	useDialogs: () => ({ addDialog }),
	useToasts: () => ({ addToast }),
	useTranslation: () => (m: { defaultMessage: string }) => m.defaultMessage,
}))

describe('WorkspaceInviteHandler', () => {
	let container: HTMLDivElement
	let root: Root

	beforeEach(() => {
		vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
		container = document.createElement('div')
		root = createRoot(container)
		location = { pathname: '/', search: '', key: 'default' }
		setInSessionStorage(SESSION_STORAGE_KEYS.WORKSPACE_INVITE_TOKEN, 'token-1')
	})

	afterEach(async () => {
		await act(async () => root.unmount())
		deleteFromSessionStorage(SESSION_STORAGE_KEYS.WORKSPACE_INVITE_TOKEN)
		vi.unstubAllGlobals()
		vi.clearAllMocks()
	})

	// The token used to be deleted before the fetch, so a failed load left nothing for a
	// reload to retry even though the toast says to try again.
	it('keeps the invite token when loading the invite fails', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

		await act(async () => root.render(<WorkspaceInviteHandler />))

		expect(fetch).toHaveBeenCalledWith('/api/app/invite/token-1', expect.anything())
		expect(addToast).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'workspace-invite-error', severity: 'error' })
		)
		expect(getFromSessionStorage(SESSION_STORAGE_KEYS.WORKSPACE_INVITE_TOKEN)).toBe('token-1')
	})

	// The restored token used to be re-fetched on every route change, re-showing the
	// error toast each time.
	it('does not retry a failed invite on route changes', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

		location = { pathname: '/', search: '?invite=true', key: 'arrival' }
		await act(async () => root.render(<WorkspaceInviteHandler />))
		// A re-render on the same invite location.
		await act(async () => root.render(<WorkspaceInviteHandler />))
		location = { pathname: '/f/file-1', search: '', key: 'route-change' }
		await act(async () => root.render(<WorkspaceInviteHandler />))

		expect(fetch).toHaveBeenCalledTimes(1)
		expect(addToast).toHaveBeenCalledTimes(1)
		expect(getFromSessionStorage(SESSION_STORAGE_KEYS.WORKSPACE_INVITE_TOKEN)).toBe('token-1')
	})

	it('retries a failed invite when the invite link is opened again', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

		location = { pathname: '/', search: '?invite=true', key: 'first-arrival' }
		await act(async () => root.render(<WorkspaceInviteHandler />))
		location = { pathname: '/f/file-1', search: '', key: 'route-change' }
		await act(async () => root.render(<WorkspaceInviteHandler />))
		location = { pathname: '/', search: '?invite=true', key: 'second-arrival' }
		await act(async () => root.render(<WorkspaceInviteHandler />))

		expect(fetch).toHaveBeenCalledTimes(2)
		expect(addToast).toHaveBeenCalledTimes(2)
	})

	it('consumes the invite token once the invite loads', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({ error: false, workspaceId: 'ws-1', workspaceName: 'Team' }),
			})
		)

		await act(async () => root.render(<WorkspaceInviteHandler />))

		expect(addDialog).toHaveBeenCalledWith(expect.objectContaining({ id: 'workspace-invite-join' }))
		expect(getFromSessionStorage(SESSION_STORAGE_KEYS.WORKSPACE_INVITE_TOKEN)).toBe(null)
	})
})
