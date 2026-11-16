import { act, fireEvent, waitFor } from '@testing-library/react'
import { createShapeId, deleteFromLocalStorage, Editor, toRichText } from '@tldraw/editor'
import { StrictMode, useState } from 'react'
import { TLComponents, Tldraw } from '../../lib/Tldraw'
import { CommandPaletteMenuItem } from '../../lib/ui/components/CommandPalette/CommandPaletteMenuItem'
import { commandPaletteOpen } from '../../lib/ui/components/CommandPalette/commandPaletteOpen'
import {
	DefaultCommandPalette,
	TLUiCommandPaletteProps,
} from '../../lib/ui/components/CommandPalette/DefaultCommandPalette'
import { TldrawUiMenuContextProvider } from '../../lib/ui/components/primitives/menus/TldrawUiMenuContext'
import {
	renderTldrawComponent,
	renderTldrawComponentWithEditor,
} from '../testutils/renderTldrawComponent'

async function setup(components?: TLComponents) {
	const { editor, rendered } = await renderTldrawComponentWithEditor(
		(onMount) => <Tldraw onMount={onMount} components={components} />,
		{ waitForPatterns: false }
	)
	act(() => editor.updateInstanceState({ isFocused: true }))
	return { editor, rendered }
}

function pressCmdK(editor: Editor, init: KeyboardEventInit = { metaKey: true }) {
	const event = new KeyboardEvent('keydown', {
		bubbles: true,
		cancelable: true,
		key: 'k',
		code: 'KeyK',
		...init,
	})
	act(() => {
		editor.getContainerDocument().body.dispatchEvent(event)
	})
	return event
}

function expectUndoShortcutWorks(editor: Editor) {
	const id = createShapeId()
	act(() => {
		editor.markHistoryStoppingPoint()
		editor.createShape({ id, type: 'geo', x: 0, y: 0 })
	})
	act(() => {
		editor
			.getContainerDocument()
			.body.dispatchEvent(
				new KeyboardEvent('keydown', { bubbles: true, key: 'z', code: 'KeyZ', metaKey: true })
			)
	})
	expect(editor.getShape(id)).toBeUndefined()
}

afterEach(() => {
	deleteFromLocalStorage('tldraw-command-palette-recents')
})

describe('command palette', () => {
	it.each([
		{ combo: 'Cmd+K', init: { metaKey: true } },
		{ combo: 'Ctrl+K', init: { ctrlKey: true } },
	])('opens on $combo with the input focused and closes on Escape', async ({ init }) => {
		const { editor, rendered } = await setup()
		pressCmdK(editor, init)
		const input = (await rendered.findByTestId('command-palette.input')) as HTMLInputElement
		expect(document.activeElement).toBe(input)
		fireEvent.keyDown(input, { key: 'Escape' })
		await waitFor(() => expect(rendered.queryByTestId('command-palette')).toBeNull())
		expect(editor.menus.getOpenMenus()).toEqual([])
	})

	it('stays open under StrictMode and leaves no open menu once closed', async () => {
		const { editor, rendered } = await renderTldrawComponentWithEditor(
			(onMount) => (
				<StrictMode>
					<Tldraw onMount={onMount} />
				</StrictMode>
			),
			{ waitForPatterns: false }
		)
		act(() => editor.updateInstanceState({ isFocused: true }))
		pressCmdK(editor)
		await act(async () => {
			await new Promise((r) => setTimeout(r, 50))
		})
		const input = rendered.getByTestId('command-palette.input')
		expect(commandPaletteOpen.get(editor)).toBe(true)
		fireEvent.keyDown(input, { key: 'Escape' })
		await waitFor(() => expect(rendered.queryByTestId('command-palette')).toBeNull())
		expect(editor.menus.getOpenMenus()).toEqual([])
	})

	it('stays open when DOM focus is on the body', async () => {
		const { editor, rendered } = await setup()
		act(() => (document.activeElement as HTMLElement | null)?.blur())
		expect(document.activeElement).toBe(document.body)
		pressCmdK(editor)
		await rendered.findByTestId('command-palette')
		await act(async () => {
			await new Promise((r) => setTimeout(r, 50))
		})
		expect(rendered.queryByTestId('command-palette')).not.toBeNull()
		expect(commandPaletteOpen.get(editor)).toBe(true)
	})

	it('only prevents the default Cmd+K behavior when a palette is mounted', async () => {
		const withPalette = await setup()
		expect(pressCmdK(withPalette.editor).defaultPrevented).toBe(true)
		withPalette.rendered.unmount()

		const withoutPalette = await setup({ CommandPalette: null })
		expect(pressCmdK(withoutPalette.editor).defaultPrevented).toBe(false)
		expect(withoutPalette.rendered.queryByTestId('command-palette')).toBeNull()
		expect(withoutPalette.editor.menus.getOpenMenus()).toEqual([])
		expectUndoShortcutWorks(withoutPalette.editor)
		withoutPalette.rendered.unmount()

		const { editor, rendered } = await renderTldrawComponentWithEditor(
			(onMount) => <Tldraw onMount={onMount} hideUi />,
			{ waitForPatterns: false }
		)
		act(() => editor.updateInstanceState({ isFocused: true }))
		expect(pressCmdK(editor).defaultPrevented).toBe(false)
		expect(editor.menus.getOpenMenus()).toEqual([])
		expect(rendered.queryByTestId('command-palette')).toBeNull()
	})

	it('does not open while a shape is being edited or another menu is open', async () => {
		const { editor, rendered } = await setup()
		const id = createShapeId()
		act(() => {
			editor.createShape({ id, type: 'text', x: 0, y: 0, props: { richText: toRichText('hi') } })
			editor.setEditingShape(id)
		})
		pressCmdK(editor)
		expect(rendered.queryByTestId('command-palette')).toBeNull()

		act(() => {
			editor.setEditingShape(null)
			editor.menus.addOpenMenu('main menu')
		})
		pressCmdK(editor)
		expect(rendered.queryByTestId('command-palette')).toBeNull()
	})

	it('starts with an empty query and the first row highlighted each time it opens', async () => {
		const { editor, rendered } = await setup()
		pressCmdK(editor)
		let input = (await rendered.findByTestId('command-palette.input')) as HTMLInputElement
		fireEvent.change(input, { target: { value: 'zoom' } })
		fireEvent.keyDown(input, { key: 'ArrowDown' })
		fireEvent.keyDown(input, { key: 'Escape' })
		await waitFor(() => expect(rendered.queryByTestId('command-palette')).toBeNull())

		pressCmdK(editor)
		input = (await rendered.findByTestId('command-palette.input')) as HTMLInputElement
		expect(input.value).toBe('')
		const options = rendered.getAllByRole('option')
		expect(options[0].getAttribute('aria-selected')).toBe('true')
	})

	it('shows its menu entry only when the palette exists', async () => {
		const renderEntry = (components?: TLComponents) =>
			renderTldrawComponent(
				<Tldraw components={components}>
					<TldrawUiMenuContextProvider type="keyboard-shortcuts" sourceId="kbd">
						<CommandPaletteMenuItem />
					</TldrawUiMenuContextProvider>
				</Tldraw>,
				{ waitForPatterns: false }
			)
		const withPalette = await renderEntry()
		expect(withPalette.getByTestId('kbd.open-command-palette')).toBeTruthy()
		withPalette.unmount()
		const withoutPalette = await renderEntry({ CommandPalette: null })
		expect(withoutPalette.queryByTestId('kbd.open-command-palette')).toBeNull()
	})
})

describe('custom command palette slot', () => {
	it('mounts while open and closes through onClose', async () => {
		function ButtonPalette({ onClose }: TLUiCommandPaletteProps) {
			return (
				<button data-testid="custom-palette" onClick={onClose}>
					close
				</button>
			)
		}
		const { editor, rendered } = await setup({ CommandPalette: ButtonPalette })
		expect(rendered.queryByTestId('custom-palette')).toBeNull()
		pressCmdK(editor)
		fireEvent.click(await rendered.findByTestId('custom-palette'))
		await waitFor(() => expect(rendered.queryByTestId('custom-palette')).toBeNull())
		expect(editor.menus.getOpenMenus()).toEqual([])
		expectUndoShortcutWorks(editor)
	})

	it('leaves shortcuts working under a slot that ignores onClose, and Cmd+K closes it', async () => {
		function InertPalette() {
			return <div data-testid="custom-palette" />
		}
		const { editor, rendered } = await setup({ CommandPalette: InertPalette })
		pressCmdK(editor)
		await rendered.findByTestId('custom-palette')
		act(() => editor.menus.clearOpenMenus())
		expect(rendered.queryByTestId('custom-palette')).not.toBeNull()
		expectUndoShortcutWorks(editor)
		pressCmdK(editor)
		await waitFor(() => expect(rendered.queryByTestId('custom-palette')).toBeNull())
	})

	it('closes a DefaultCommandPalette that gets no props on Escape', async () => {
		function TopPalette() {
			return <DefaultCommandPalette position="top" />
		}
		const { editor, rendered } = await setup({ CommandPalette: TopPalette })
		pressCmdK(editor)
		const input = await rendered.findByTestId('command-palette.input')
		fireEvent.keyDown(input, { key: 'Escape' })
		await waitFor(() => expect(rendered.queryByTestId('command-palette')).toBeNull())
		expect(editor.menus.getOpenMenus()).toEqual([])
		expectUndoShortcutWorks(editor)
	})

	it('clears the open mark when the UI hides while the palette is open', async () => {
		let setHideUi: (hideUi: boolean) => void = () => {}
		function App({ onMount }: { onMount(editor: Editor): void }) {
			const [hideUi, _setHideUi] = useState(false)
			setHideUi = _setHideUi
			return <Tldraw onMount={onMount} hideUi={hideUi} />
		}
		const { editor, rendered } = await renderTldrawComponentWithEditor(
			(onMount) => <App onMount={onMount} />,
			{ waitForPatterns: false }
		)
		act(() => editor.updateInstanceState({ isFocused: true }))
		pressCmdK(editor)
		await rendered.findByTestId('command-palette')
		act(() => setHideUi(true))
		expect(rendered.queryByTestId('command-palette')).toBeNull()
		expect(editor.menus.getOpenMenus()).toEqual([])
	})
})
