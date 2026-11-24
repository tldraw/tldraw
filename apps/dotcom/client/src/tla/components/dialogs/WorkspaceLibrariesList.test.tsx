import {
	InMemoryLibrarySource,
	LibraryItemRecordType,
	LibraryRecordType,
	type TLLibraryItemContent,
} from '@tldraw/libraries'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createTLSchema } from 'tldraw'
import { WorkspaceLibrariesList } from './WorkspaceLibrariesList'

const mocks = vi.hoisted(() => ({
	libraryRows: [] as { id: string; isDefault: boolean; fileCount: number }[],
}))

vi.mock('../../hooks/useAppState', () => ({
	useApp: () => ({
		getLibraryRows: () => mocks.libraryRows,
		getWorkspaceMemberships: () => [],
		trackEvent: () => {},
		getHomeWorkspaceId: () => 'home',
	}),
}))

vi.mock('tldraw', async (importOriginal) => ({
	...(await importOriginal<typeof import('tldraw')>()),
	useDialogs: () => ({ addDialog: () => {} }),
	useToasts: () => ({ addToast: () => {} }),
	useTranslation: () => (message: { defaultMessage: string }) => message.defaultMessage,
}))

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

let root: Root
let container: HTMLDivElement

afterEach(() => {
	act(() => root.unmount())
	container.remove()
	mocks.libraryRows = []
})

const content: TLLibraryItemContent = {
	formatVersion: 1,
	content: {
		shapes: [],
		bindings: [],
		rootShapeIds: [],
		assets: [],
		schema: createTLSchema().serialize(),
	},
}

function render({ fileCount = 1 } = {}) {
	const library = LibraryRecordType.create({ name: 'Icons', ownerId: 'workspace' })
	mocks.libraryRows = [{ id: library.id.slice('library:'.length), isDefault: false, fileCount }]
	const items = [LibraryItemRecordType.create({ libraryId: library.id })]
	const source = new InMemoryLibrarySource({
		owners: [{ id: 'workspace', name: 'Workspace' }],
		initial: {
			libraries: [library],
			items,
			contents: Object.fromEntries(items.map((item) => [item.id, content])),
		},
		can: () => false,
	})
	container = document.createElement('div')
	document.body.appendChild(container)
	root = createRoot(container)
	act(() => root.render(<WorkspaceLibrariesList source={source} workspaceId="workspace" />))
}

it("notes a library that isn't in any file", () => {
	render({ fileCount: 0 })
	expect(container.textContent).toContain('Not in any file')
})

it("doesn't note a library added to a file", () => {
	render({ fileCount: 2 })
	expect(container.textContent).toContain('Icons')
	expect(container.textContent).not.toContain('Not in any file')
})
