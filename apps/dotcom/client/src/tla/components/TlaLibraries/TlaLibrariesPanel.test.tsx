import type { LibrarySource } from '@tldraw/libraries'
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
	TldrawUiContextProvider,
} from 'tldraw'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fileSchemaRecords } from '../../../utils/fileSchemaRecords'
import { createFakeLibrariesBackend } from './fakeLibrariesBackend'
import { TldrawAppLibrariesSource } from './librariesSource'
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

// The user's default library, which every file shows, holding a "Button".
async function makeAppWithLibraries() {
	const backend = createFakeLibrariesBackend({ userId: 'home' })
	vi.stubGlobal('fetch', backend.fetch)
	const libraries = new TldrawAppLibrariesSource(backend.app, backend.getToken)
	libraries.ensureDefaultLibrary()
	const [stash] = libraries.getLibraries()
	await libraries.addItem(stash.id, {
		name: 'Button',
		content: {
			formatVersion: 1,
			content: {
				shapes: [],
				bindings: [],
				rootShapeIds: [],
				assets: [],
				schema: createTLSchema().serialize(),
			},
		},
	})
	return Object.assign(backend.app, { libraries })
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
	vi.unstubAllGlobals()
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
		app.current = (await makeAppWithLibraries()) as any
		await renderPalette()
		expect(rowIds()).toEqual([
			'toggle-libraries-panel',
			'browse-libraries',
			expect.stringMatching(/^library-item:/),
		])

		await type('button')
		expect(rowIds()).toEqual([expect.stringMatching(/^library-item:/)])
	})

	it('shows nothing when libraries are off', async () => {
		app.current = makeApp(null)
		await renderPalette()
		expect(rowIds()).toEqual([])
	})
})
