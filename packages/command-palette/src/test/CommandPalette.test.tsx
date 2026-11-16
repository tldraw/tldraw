import { act, fireEvent, waitFor } from '@testing-library/react'
import { StrictMode, useState } from 'react'
import {
	createShapeId,
	deleteFromLocalStorage,
	Editor,
	toRichText,
	TLComponents,
	Tldraw,
	TldrawProps,
	TldrawUiMenuContextProvider,
	TldrawUiMenuItem,
	TLUiOverrides,
} from 'tldraw'
import { vi } from 'vitest'
import { CommandPalette, commandPaletteOverrides } from '../lib/CommandPalette'
import { CommandPaletteMenuItem } from '../lib/CommandPaletteMenuItem'
import { commandPaletteOpen } from '../lib/commandPaletteOpen'
import { DefaultCommandPalette } from '../lib/DefaultCommandPalette'
import { renderTldrawComponent, renderTldrawComponentWithEditor } from './renderTldrawComponent'

const paletteComponents: TLComponents = { CommandPalette }

async function setup(props: Partial<TldrawProps> = {}) {
	const { editor, rendered } = await renderTldrawComponentWithEditor(
		(onMount) => (
			<Tldraw
				onMount={onMount}
				components={paletteComponents}
				overrides={commandPaletteOverrides}
				{...props}
			/>
		),
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

	it('reports opening with the source that opened it', async () => {
		const onUiEvent = vi.fn()
		const { editor, rendered } = await setup({ onUiEvent })
		pressCmdK(editor)
		await rendered.findByTestId('command-palette')
		expect(onUiEvent).toHaveBeenCalledWith('open-command-palette', { source: 'kbd' })
	})

	it('stays open under StrictMode and leaves no open menu once closed', async () => {
		const { editor, rendered } = await renderTldrawComponentWithEditor(
			(onMount) => (
				<StrictMode>
					<Tldraw
						onMount={onMount}
						components={paletteComponents}
						overrides={commandPaletteOverrides}
					/>
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

	it('leaves Cmd+K alone without the overrides', async () => {
		const { editor, rendered } = await setup({ overrides: undefined })
		expect(pressCmdK(editor).defaultPrevented).toBe(false)
		expect(rendered.queryByTestId('command-palette')).toBeNull()
		expect(editor.menus.getOpenMenus()).toEqual([])
		expectUndoShortcutWorks(editor)
	})

	it.each([
		{ when: 'the slot is empty', props: { components: { CommandPalette: null } } },
		{ when: 'the UI is hidden', props: { hideUi: true } },
	])('opens nothing when $when', async ({ props }) => {
		const { editor, rendered } = await setup(props)
		pressCmdK(editor)
		expect(rendered.queryByTestId('command-palette')).toBeNull()
		expect(commandPaletteOpen.get(editor)).toBe(false)
		expect(editor.menus.getOpenMenus()).toEqual([])
		expectUndoShortcutWorks(editor)
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

	it('shows its menu entry only with the slot and the overrides', async () => {
		const renderEntry = (components?: TLComponents, overrides?: TLUiOverrides) =>
			renderTldrawComponent(
				<Tldraw components={components} overrides={overrides}>
					<TldrawUiMenuContextProvider type="keyboard-shortcuts" sourceId="kbd">
						<CommandPaletteMenuItem />
					</TldrawUiMenuContextProvider>
				</Tldraw>,
				{ waitForPatterns: false }
			)
		const withPalette = await renderEntry(paletteComponents, commandPaletteOverrides)
		expect(withPalette.getByTestId('kbd.open-command-palette')).toBeTruthy()
		withPalette.unmount()
		const withoutSlot = await renderEntry(undefined, commandPaletteOverrides)
		expect(withoutSlot.queryByTestId('kbd.open-command-palette')).toBeNull()
		withoutSlot.unmount()
		const withoutOverrides = await renderEntry(paletteComponents)
		expect(withoutOverrides.queryByTestId('kbd.open-command-palette')).toBeNull()
	})
})

describe('customizing the command palette', () => {
	it('takes props through a wrapper', async () => {
		function TopPalette() {
			return <CommandPalette position="top" />
		}
		const { editor, rendered } = await setup({ components: { CommandPalette: TopPalette } })
		pressCmdK(editor)
		const input = await rendered.findByTestId('command-palette.input')
		expect(rendered.getByTestId('command-palette').dataset.position).toBe('top')
		fireEvent.keyDown(input, { key: 'Escape' })
		await waitFor(() => expect(rendered.queryByTestId('command-palette')).toBeNull())
		expect(editor.menus.getOpenMenus()).toEqual([])
		expectUndoShortcutWorks(editor)
	})

	it('lists its children instead of the default content', async () => {
		function HelloPalette() {
			return (
				<CommandPalette>
					<TldrawUiMenuItem id="say-hello" label="Say hello" onSelect={() => {}} />
				</CommandPalette>
			)
		}
		const { editor, rendered } = await setup({ components: { CommandPalette: HelloPalette } })
		pressCmdK(editor)
		await rendered.findByTestId('command-palette.item.say-hello')
		expect(rendered.getAllByRole('option')).toHaveLength(1)
	})

	it('closes a DefaultCommandPalette that gets no onClose on Escape', async () => {
		const { editor, rendered } = await renderTldrawComponentWithEditor(
			(onMount) => (
				<Tldraw onMount={onMount}>
					<DefaultCommandPalette />
				</Tldraw>
			),
			{ waitForPatterns: false }
		)
		act(() => commandPaletteOpen.set(editor, true))
		const input = await rendered.findByTestId('command-palette.input')
		fireEvent.keyDown(input, { key: 'Escape' })
		expect(commandPaletteOpen.get(editor)).toBe(false)
	})

	it('clears the open mark when the UI hides while the palette is open', async () => {
		let setHideUi: (hideUi: boolean) => void = () => {}
		function App({ onMount }: { onMount(editor: Editor): void }) {
			const [hideUi, _setHideUi] = useState(false)
			setHideUi = _setHideUi
			return (
				<Tldraw
					onMount={onMount}
					hideUi={hideUi}
					components={paletteComponents}
					overrides={commandPaletteOverrides}
				/>
			)
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
		expect(commandPaletteOpen.get(editor)).toBe(false)
		expect(editor.menus.getOpenMenus()).toEqual([])
	})
})
