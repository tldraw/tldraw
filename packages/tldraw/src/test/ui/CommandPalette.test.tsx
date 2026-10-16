import { act, fireEvent, waitFor } from '@testing-library/react'
import { createShapeId, Editor, toRichText } from '@tldraw/editor'
import { TLComponents, Tldraw } from '../../lib/Tldraw'
import { CommandPaletteMenuItem } from '../../lib/ui/components/CommandPalette/CommandPaletteMenuItem'
import { isCommandPaletteMounted } from '../../lib/ui/components/CommandPalette/commandPaletteMount'
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

describe('command palette', () => {
	it('opens on Cmd+K with the input focused and closes on Escape', async () => {
		const { editor, rendered } = await setup()
		pressCmdK(editor)
		const input = (await rendered.findByTestId('command-palette.input')) as HTMLInputElement
		expect(document.activeElement).toBe(input)
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
		expect(editor.menus.getOpenMenus()).toHaveLength(1)
	})

	it('opens on Ctrl+K', async () => {
		const { editor, rendered } = await setup()
		pressCmdK(editor, { ctrlKey: true })
		await rendered.findByTestId('command-palette')
	})

	it('does nothing when turned off, and other shortcuts keep working', async () => {
		const { editor, rendered } = await setup({ CommandPalette: null })
		const id = createShapeId()
		act(() => {
			editor.markHistoryStoppingPoint()
			editor.createShape({ id, type: 'geo', x: 0, y: 0 })
		})
		pressCmdK(editor)
		expect(rendered.queryByTestId('command-palette')).toBeNull()
		expect(editor.menus.getOpenMenus()).toEqual([])
		act(() => {
			editor
				.getContainerDocument()
				.body.dispatchEvent(
					new KeyboardEvent('keydown', { bubbles: true, key: 'z', code: 'KeyZ', metaKey: true })
				)
		})
		expect(editor.getShape(id)).toBeUndefined()
	})

	it('only prevents the default Cmd+K behavior when a palette is mounted', async () => {
		const withPalette = await setup()
		expect(pressCmdK(withPalette.editor).defaultPrevented).toBe(true)
		withPalette.rendered.unmount()

		const withoutPalette = await setup({ CommandPalette: null })
		expect(pressCmdK(withoutPalette.editor).defaultPrevented).toBe(false)
		expect(withoutPalette.editor.menus.getOpenMenus()).toEqual([])
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

	it('tracks per editor whether a palette is mounted', async () => {
		const editors: Editor[] = []
		await renderTldrawComponent(
			<>
				<Tldraw onMount={(editor) => void (editors[0] = editor)} />
				<Tldraw
					onMount={(editor) => void (editors[1] = editor)}
					components={{ CommandPalette: null }}
				/>
			</>,
			{ waitForPatterns: false }
		)
		await waitFor(() => expect(editors.filter(Boolean)).toHaveLength(2))
		expect(isCommandPaletteMounted(editors[0])).toBe(true)
		expect(isCommandPaletteMounted(editors[1])).toBe(false)
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
