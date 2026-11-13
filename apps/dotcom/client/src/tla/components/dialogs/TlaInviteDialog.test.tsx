import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TlaInviteDialog } from './TlaInviteDialog'

const acceptWorkspaceInvite = vi.fn()

vi.mock('../../hooks/useAppState', () => ({
	useMaybeApp: () => ({ acceptWorkspaceInvite }),
}))

vi.mock('tldraw', () => ({
	F: ({ defaultMessage }: { defaultMessage: string }) => defaultMessage,
	TldrawUiDialogBody: ({ children }: { children: ReactNode }) => children,
	TldrawUiDialogCloseButton: () => null,
	TldrawUiDialogHeader: ({ children }: { children: ReactNode }) => children,
	TldrawUiDialogTitle: ({ children }: { children: ReactNode }) => children,
}))

const inviteInfo = {
	error: false,
	workspaceId: 'ws-1',
	workspaceName: 'Team',
	inviteSecret: 'secret-1',
} as Parameters<typeof TlaInviteDialog>[0]['inviteInfo']

describe('TlaInviteDialog', () => {
	let container: HTMLDivElement
	let root: Root

	beforeEach(() => {
		vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
		container = document.createElement('div')
		root = createRoot(container)
	})

	afterEach(async () => {
		await act(async () => root.unmount())
		vi.unstubAllGlobals()
		vi.clearAllMocks()
	})

	// The accept button was only re-enabled after a resolved accept, so a rejection left it
	// disabled for good.
	it('re-enables the accept button when accepting throws', async () => {
		const error = new Error('navigate failed')
		acceptWorkspaceInvite.mockRejectedValue(error)
		const onClose = vi.fn()
		// The click handler rethrows so the failure still reaches error reporting.
		const onUnhandledRejection = vi.fn()
		process.on('unhandledRejection', onUnhandledRejection)

		try {
			await act(async () =>
				root.render(<TlaInviteDialog inviteInfo={inviteInfo} onClose={onClose} />)
			)
			const button = container.querySelector('button')!
			await act(async () => button.click())
			await new Promise((resolve) => setTimeout(resolve, 0))

			expect(button.disabled).toBe(false)
			expect(onUnhandledRejection).toHaveBeenCalledWith(error, expect.anything())
		} finally {
			process.off('unhandledRejection', onUnhandledRejection)
		}
		expect(acceptWorkspaceInvite).toHaveBeenCalledWith('secret-1')
		expect(onClose).not.toHaveBeenCalled()
	})
})
