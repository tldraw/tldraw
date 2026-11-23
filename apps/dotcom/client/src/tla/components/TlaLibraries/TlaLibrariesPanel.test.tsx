import { InMemoryLibrarySource, LibraryItemRecordType, type LibrarySource } from '@tldraw/libraries'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
	CommandPaletteShell,
	ContainerProvider,
	createTLSchema,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	deleteFromLocalStorage,
	Editor,
	EditorContext,
	LibraryRecordType,
	TldrawUiContextProvider,
} from 'tldraw'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fileSchemaRecords } from '../../../utils/fileSchemaRecords'
import { TlaLibrariesCommandPaletteGroup } from './TlaLibrariesPanel'

const app = vi.hoisted(() => ({ current: null as null | { libraries: LibrarySource | null } }))

vi.mock('../../hooks/useAppState', () => ({ useMaybeApp: () => app.current }))
vi.mock('../../hooks/useCurrentFileId', () => ({ useCurrentFileId: () => 'file-a' }))
vi.mock('tldraw', async (importOriginal) => ({
	...(await importOriginal<typeof import('tldraw')>()),
	useLicenseFeatureFlag: () => true,
}))

function makeApp(libraries: LibrarySource | null) {
	return {
		libraries,
		getHomeWorkspaceId: () => 'home',
		msg: (message: { defaultMessage: string }) => message.defaultMessage,
		trackEvent: vi.fn(),
	}
}

function makeUserLibraries() {
	const library = LibraryRecordType.create({ name: 'Wireframes', ownerId: 'home' })
	const item = LibraryItemRecordType.create({ libraryId: library.id, name: 'Button' })
	return new InMemoryLibrarySource({
		id: 'user',
		owners: [{ id: 'home', name: 'My workspace' }],
		initial: {
			libraries: [library],
			items: [item],
			contents: {
				[item.id]: {
					formatVersion: 1,
					content: {
						shapes: [],
						bindings: [],
						rootShapeIds: [],
						assets: [],
						schema: createTLSchema().serialize(),
					},
				},
			},
		},
	})
}

let container: HTMLDivElement
let root: Root
let editor: Editor

beforeAll(() => {
	;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
	globalThis.ResizeObserver ??= class {
		observe() {}
		unobserve() {}
		disconnect() {}
	}
	Element.prototype.scrollTo ??= () => {}
	Element.prototype.scrollIntoView ??= () => {}
	HTMLImageElement.prototype.decode ??= () => Promise.resolve()
})

beforeEach(() => {
	container = document.createElement('div')
	document.body.appendChild(container)
	root = createRoot(container)
	editor = new Editor({
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: [],
		store: createTLStore({ schema: createTLSchema({ records: fileSchemaRecords }) }),
		getContainer: () => container,
	})
})

afterEach(() => {
	deleteFromLocalStorage('tldraw-command-palette-recents')
	act(() => root.unmount())
	editor.dispose()
	container.remove()
	app.current = null
})

async function renderPalette() {
	await act(async () => {
		root.render(
			<ContainerProvider container={container}>
				<EditorContext.Provider value={editor}>
					<TldrawUiContextProvider>
						<CommandPaletteShell onClose={() => {}}>
							<TlaLibrariesCommandPaletteGroup />
						</CommandPaletteShell>
					</TldrawUiContextProvider>
				</EditorContext.Provider>
			</ContainerProvider>
		)
	})
}

async function type(query: string) {
	const input = container.querySelector<HTMLInputElement>('[data-testid="command-palette.input"]')!
	const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
	await act(async () => {
		setValue.call(input, query)
		input.dispatchEvent(new Event('input', { bubbles: true }))
	})
	await act(async () => {})
}

function rowIds() {
	return [...container.querySelectorAll('[data-testid^="command-palette.item."]')].map((row) =>
		row.getAttribute('data-testid')!.replace('command-palette.item.', '')
	)
}

describe('TlaLibrariesCommandPaletteGroup', () => {
	it("lists the libraries commands and the user's items when libraries are on", async () => {
		app.current = makeApp(makeUserLibraries())
		await renderPalette()
		expect(rowIds()).toEqual(['toggle-libraries-panel', 'tla-browse-starter-packs'])

		await type('button')
		expect(rowIds()).toEqual([expect.stringMatching(/^library-item:/)])
	})

	it('shows nothing when libraries are off', async () => {
		app.current = makeApp(null)
		await renderPalette()
		expect(rowIds()).toEqual([])
	})
})
