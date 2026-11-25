import {
	InMemoryLibrarySource,
	LibraryItemRecordType,
	LibraryRecordType,
	type TLLibraryItemContent,
	type TLLibraryThumbnail,
} from '@tldraw/libraries'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createTLSchema } from 'tldraw'
import { WorkspaceLibrariesList } from './WorkspaceLibrariesList'

const mocks = vi.hoisted(() => ({
	theme: 'light' as 'light' | 'dark',
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

vi.mock('../../utils/local-session-state', () => ({
	getLocalSessionState: () => ({ theme: mocks.theme }),
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
	mocks.theme = 'light'
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

function render(thumbnails: (TLLibraryThumbnail | undefined)[], { fileCount = 1 } = {}) {
	const library = LibraryRecordType.create({ name: 'Icons', ownerId: 'workspace' })
	mocks.libraryRows = [{ id: library.id.slice('library:'.length), isDefault: false, fileCount }]
	const items = thumbnails.map((thumbnail) =>
		LibraryItemRecordType.create({ libraryId: library.id, thumbnail })
	)
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

function renderList(thumbnails: (TLLibraryThumbnail | undefined)[]) {
	render(thumbnails)
	const tiles = [...container.querySelectorAll('[aria-hidden] > span')]
	return tiles.map((tile) => tile.querySelector('img')?.getAttribute('src'))
}

it("shows a card's first four thumbnails, with blank tiles for the rest", () => {
	expect(renderList(['a.png', undefined, 'c.png'])).toEqual([
		'a.png',
		undefined,
		'c.png',
		undefined,
	])
})

it('shows four blank tiles for a library with no items', () => {
	expect(renderList([])).toEqual([undefined, undefined, undefined, undefined])
})

it('shows no more than four thumbnails', () => {
	expect(renderList(['a.png', 'b.png', 'c.png', 'd.png', 'e.png'])).toEqual([
		'a.png',
		'b.png',
		'c.png',
		'd.png',
	])
})

it("picks each thumbnail's image for the app's colour scheme", () => {
	mocks.theme = 'dark'
	expect(renderList([{ light: 'light.png', dark: 'dark.png' }])[0]).toBe('dark.png')
})

it("notes a library that isn't in any file", () => {
	render([], { fileCount: 0 })
	expect(container.textContent).toContain('Not in any file')
})

it("doesn't note a library added to a file", () => {
	render([], { fileCount: 2 })
	expect(container.textContent).toContain('Icons')
	expect(container.textContent).not.toContain('Not in any file')
})
