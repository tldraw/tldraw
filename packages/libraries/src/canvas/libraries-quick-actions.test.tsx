import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
	ContainerProvider,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	Editor,
	EditorContext,
	TldrawUiContextProvider,
	TldrawUiToolbar,
} from 'tldraw'
import { vi } from 'vitest'
import { LibrariesToolbarButton, librariesPanelOpen } from '../index'

vi.mock('./license', () => ({ useLibrariesEnabled: () => true }))

let container: HTMLDivElement
let root: Root
let editor: Editor

beforeAll(() => {
	;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
})

beforeEach(() => {
	container = document.createElement('div')
	document.body.appendChild(container)
	root = createRoot(container)
	editor = new Editor({
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: [],
		store: createTLStore({ shapeUtils: defaultShapeUtils, bindingUtils: defaultBindingUtils }),
		getContainer: () => container,
	})
})

afterEach(() => {
	act(() => root.unmount())
	editor.dispose()
	container.remove()
})

describe('LibrariesToolbarButton', () => {
	it('toggles the panel on its own, outside LibrariesQuickActions', async () => {
		await act(async () => {
			root.render(
				<ContainerProvider container={container}>
					<EditorContext.Provider value={editor}>
						<TldrawUiContextProvider>
							<TldrawUiToolbar label="Quick actions">
								<LibrariesToolbarButton />
							</TldrawUiToolbar>
						</TldrawUiContextProvider>
					</EditorContext.Provider>
				</ContainerProvider>
			)
		})
		const button = container.querySelector<HTMLButtonElement>('button[aria-pressed]')!
		expect(button.getAttribute('aria-pressed')).toBe('false')
		act(() => button.click())
		expect(librariesPanelOpen.get(editor)).toBe(true)
		expect(button.getAttribute('aria-pressed')).toBe('true')
	})
})
