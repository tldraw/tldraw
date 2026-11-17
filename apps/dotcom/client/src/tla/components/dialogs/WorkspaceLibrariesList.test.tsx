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

const mocks = vi.hoisted(() => ({ theme: 'light' as 'light' | 'dark' }))

vi.mock('../../hooks/useAppState', () => ({
	useApp: () => ({
		getLibraryRows: () => [],
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

function renderList(thumbnails: (TLLibraryThumbnail | undefined)[]) {
	const library = LibraryRecordType.create({ name: 'Icons', ownerId: 'workspace' })
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
