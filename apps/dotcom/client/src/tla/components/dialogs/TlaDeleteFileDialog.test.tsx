import { act, ReactNode } from 'react'
import { createRoot, Root } from 'react-dom/client'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TlaDeleteFileDialog } from './TlaDeleteFileDialog'

const { app, onClose, trackEvent } = vi.hoisted(() => ({
	app: {
		deleteOrForgetFile: vi.fn(),
		getFileName: vi.fn(),
		getHomeWorkspaceId: vi.fn(),
		getMyFiles: vi.fn(),
		getWorkspaceFilesSorted: vi.fn(),
		createFile: vi.fn(),
	},
	onClose: vi.fn(),
	trackEvent: vi.fn(),
}))

vi.mock('@clerk/clerk-react', () => ({ useAuth: () => ({ getToken: async () => 'test-token' }) }))
vi.mock('../../hooks/useAppState', () => ({ useApp: () => app }))
vi.mock('../../hooks/useIsFileOwner', () => ({ useHasFileAdminRights: () => true }))
vi.mock('../../utils/app-ui-events', () => ({ useTldrawAppUiEvents: () => trackEvent }))
vi.mock('tldraw', () => {
	const Container = ({ children }: { children?: ReactNode }) => <div>{children}</div>
	return {
		F: ({ defaultMessage }: { defaultMessage: string }) => defaultMessage,
		useValue: (_name: string, getValue: () => unknown) => getValue(),
		TldrawUiButton: ({ children, onClick }: { children: ReactNode; onClick(): void }) => (
			<button onClick={onClick}>{children}</button>
		),
		TldrawUiButtonLabel: Container,
		TldrawUiDialogBody: Container,
		TldrawUiDialogCloseButton: () => null,
		TldrawUiDialogFooter: Container,
		TldrawUiDialogHeader: Container,
		TldrawUiDialogTitle: Container,
	}
})

function Location() {
	return <output>{useLocation().pathname}</output>
}

describe('TlaDeleteFileDialog navigation', () => {
	let container: HTMLDivElement
	let root: Root

	beforeEach(() => {
		vi.resetAllMocks()
		vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
		app.deleteOrForgetFile.mockResolvedValue(true)
		app.getFileName.mockReturnValue('Board')
		app.getHomeWorkspaceId.mockReturnValue('home')
		app.getMyFiles.mockReturnValue([])
		app.getWorkspaceFilesSorted.mockReturnValue([])
		app.createFile.mockResolvedValue({ ok: true, value: { fileId: 'replacement' } })
		container = document.createElement('div')
		document.body.appendChild(container)
		root = createRoot(container)
	})

	afterEach(() => {
		act(() => root.unmount())
		container.remove()
		vi.unstubAllGlobals()
	})

	async function deleteFile(path: string, workspaceId = 'workspace') {
		act(() => {
			root.render(
				<MemoryRouter initialEntries={[path]}>
					<Location />
					<TlaDeleteFileDialog fileId="deleted" workspaceId={workspaceId} onClose={onClose} />
				</MemoryRouter>
			)
		})
		const button = [...container.querySelectorAll('button')].find(
			(button) => button.textContent === 'Delete'
		)!
		await act(async () => button.click())
		return container.querySelector('output')!.textContent
	}

	it.each([
		['home', []],
		['home', [{ fileId: 'remaining' }]],
		['workspace', []],
		['workspace', [{ fileId: 'remaining' }]],
	])(
		'stays in the %s gallery after deleting a board with %j remaining',
		async (workspaceId, files) => {
			app.getMyFiles.mockReturnValue(files)
			app.getWorkspaceFilesSorted.mockReturnValue(files)

			expect(await deleteFile(`/w/${workspaceId}`, workspaceId)).toBe(`/w/${workspaceId}`)
			expect(app.deleteOrForgetFile).toHaveBeenCalledWith('deleted', workspaceId)
			expect(app.createFile).not.toHaveBeenCalled()
			expect(onClose).toHaveBeenCalledOnce()
		}
	)

	it('keeps another open board visible when deleting a sidebar board', async () => {
		app.getWorkspaceFilesSorted.mockReturnValue([{ fileId: 'remaining' }])
		expect(await deleteFile('/f/open')).toBe('/f/open')
		expect(app.createFile).not.toHaveBeenCalled()
	})

	it('opens a remaining board when deleting the current board', async () => {
		app.getWorkspaceFilesSorted.mockReturnValue([{ fileId: 'remaining' }])
		expect(await deleteFile('/f/deleted?d=test')).toBe('/f/remaining')
		expect(app.createFile).not.toHaveBeenCalled()
	})

	it('creates a replacement when deleting the last open board', async () => {
		expect(await deleteFile('/f/deleted')).toBe('/f/replacement')
		expect(app.createFile).toHaveBeenCalledWith({ workspaceId: 'workspace' })
	})

	it('does not navigate or create a replacement when deletion fails', async () => {
		app.deleteOrForgetFile.mockResolvedValue(false)
		expect(await deleteFile('/f/deleted')).toBe('/f/deleted')
		expect(app.createFile).not.toHaveBeenCalled()
		expect(trackEvent).not.toHaveBeenCalled()
		expect(onClose).toHaveBeenCalledOnce()
	})
})
