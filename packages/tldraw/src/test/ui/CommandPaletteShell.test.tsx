import { act, fireEvent, waitFor, within } from '@testing-library/react'
import { deleteFromLocalStorage } from '@tldraw/editor'
import { ReactNode } from 'react'
import { vi } from 'vitest'
import { Tldraw } from '../../lib/Tldraw'
import { commandPaletteFlags } from '../../lib/ui/components/CommandPalette/commandPaletteFlags'
import { CommandPalettePromptItem } from '../../lib/ui/components/CommandPalette/CommandPalettePromptItem'
import {
	addCommandPaletteRecent,
	getCommandPaletteRecents,
} from '../../lib/ui/components/CommandPalette/commandPaletteRecents'
import { CommandPaletteShell } from '../../lib/ui/components/CommandPalette/CommandPaletteShell'
import { TldrawUiMenuCheckboxItem } from '../../lib/ui/components/primitives/menus/TldrawUiMenuCheckboxItem'
import { TldrawUiMenuGroup } from '../../lib/ui/components/primitives/menus/TldrawUiMenuGroup'
import { TldrawUiMenuItem } from '../../lib/ui/components/primitives/menus/TldrawUiMenuItem'
import { TldrawUiMenuSubmenu } from '../../lib/ui/components/primitives/menus/TldrawUiMenuSubmenu'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

// setupVitest mocks useTranslation to echo keys; these tests assert the English strings.
vi.mock('../../lib/ui/hooks/useTranslation/useTranslation', async () =>
	vi.importActual('../../lib/ui/hooks/useTranslation/useTranslation')
)

afterEach(() => {
	deleteFromLocalStorage('tldraw-command-palette-recents')
	commandPaletteFlags.checkmarksOnRight.set(false)
	commandPaletteFlags.topSection.set('recent')
	commandPaletteFlags.showGroupHeadings.set(true)
	commandPaletteFlags.showIcons.set(false)
	commandPaletteFlags.showDisabledReasons.set(true)
	commandPaletteFlags.groupSubmenus.set(true)
	commandPaletteFlags.nameNewFiles.set(false)
	commandPaletteFlags.position.set('bottom')
})

async function renderShell(children: ReactNode, onClose: () => void = vi.fn()) {
	const { editor, rendered } = await renderTldrawComponentWithEditor(
		(onMount) => (
			<Tldraw onMount={onMount}>
				<CommandPaletteShell onClose={onClose}>{children}</CommandPaletteShell>
			</Tldraw>
		),
		{ waitForPatterns: false }
	)
	const input = (await rendered.findByTestId('command-palette.input')) as HTMLInputElement
	return { editor, rendered, input }
}

const type = (input: HTMLInputElement, value: string) =>
	fireEvent.change(input, { target: { value } })
const press = (input: HTMLInputElement, key: string, init: KeyboardEventInit = {}) =>
	fireEvent.keyDown(input, { key, ...init })

function item(id: string, label: string, onSelect = vi.fn(), extra: object = {}) {
	return <TldrawUiMenuItem key={id} id={id} label={label} onSelect={onSelect} {...extra} />
}

describe('CommandPaletteShell', () => {
	it('heads groups by default, and lists them without headings when the flag is off', async () => {
		const { rendered } = await renderShell(
			<TldrawUiMenuGroup id="edit" label="menu.edit">
				{item('alpha', 'Alpha')}
				{item('beta', 'Beta')}
			</TldrawUiMenuGroup>
		)
		await rendered.findByTestId('command-palette.item.alpha')
		const palette = within(rendered.getByTestId('command-palette'))
		expect(palette.queryByText('Edit')).not.toBeNull()
		act(() => void commandPaletteFlags.showGroupHeadings.set(false))
		expect(palette.queryByText('Edit')).toBeNull()
		expect(rendered.getByTestId('command-palette.item.beta')).toBeTruthy()
	})

	it('keeps only options and groups inside the listbox, with the empty message outside', async () => {
		addCommandPaletteRecent('alpha')
		const { rendered, input } = await renderShell(
			<TldrawUiMenuGroup id="edit" label="menu.edit">
				{item('alpha', 'Alpha')}
			</TldrawUiMenuGroup>
		)
		const listbox = await rendered.findByRole('listbox')
		const recent = await within(listbox).findByRole('group', { name: 'Recent' })
		expect(within(recent).getByRole('option', { name: /Alpha/ })).toBeTruthy()
		expect(
			Array.from(listbox.children).every((child) =>
				['group', 'option'].includes(child.getAttribute('role')!)
			)
		).toBe(true)

		type(input, 'zzzzqqq')
		const noResults = await rendered.findByText('No results')
		expect(listbox.contains(noResults)).toBe(false)
		expect(listbox.children).toHaveLength(0)
	})

	it('filters and ranks as you type', async () => {
		const { rendered, input } = await renderShell(
			<>
				{item('realign', 'Realign')}
				{item('zoom', 'Zoom in')}
				{item('align', 'Align left')}
			</>
		)
		type(input, 'align')
		await waitFor(() =>
			expect(rendered.getAllByRole('option').map((el) => el.dataset.testid)).toEqual([
				'command-palette.item.align',
				'command-palette.item.realign',
			])
		)
	})

	it('closes before running the highlighted item on Enter and records it', async () => {
		const calls: string[] = []
		const { input } = await renderShell(
			item(
				'alpha',
				'Alpha',
				vi.fn(() => calls.push('select'))
			),
			() => calls.push('close')
		)
		type(input, 'alp')
		press(input, 'Enter')
		expect(calls).toEqual(['close', 'select'])
		expect(getCommandPaletteRecents()).toEqual(['alpha'])
	})

	it('moves the highlight with the arrow keys and wraps around', async () => {
		const { rendered, input } = await renderShell(
			<>
				{item('alpha', 'Alpha')}
				{item('beta', 'Beta')}
			</>
		)
		const selected = () =>
			rendered.getAllByRole('option').find((el) => el.getAttribute('aria-selected') === 'true')
				?.dataset.testid
		// The pinned feature flags row comes first.
		await waitFor(() =>
			expect(selected()).toBe('command-palette.submenu.Command palette feature flags')
		)
		press(input, 'ArrowUp')
		expect(selected()).toBe('command-palette.item.beta')
		press(input, 'ArrowDown')
		expect(selected()).toBe('command-palette.submenu.Command palette feature flags')
		press(input, 'Tab')
		expect(selected()).toBe('command-palette.item.alpha')
	})

	it('shows the shortcut instead of the disabled reason when reasons are off', async () => {
		commandPaletteFlags.showDisabledReasons.set(false)
		const { rendered, input } = await renderShell(
			item('redo', 'Redo', vi.fn(), {
				disabled: true,
				disabledReason: 'command-palette.reason.nothing-to-redo',
				kbd: '$!z',
			})
		)
		type(input, 'redo')
		const row = await rendered.findByTestId('command-palette.item.redo')
		expect(row.querySelector('.tlui-kbd')).not.toBeNull()
		expect(rendered.queryByText('Nothing to redo')).toBeNull()
	})

	it('shows the reason for a disabled item and does not run it', async () => {
		const onSelect = vi.fn()
		const { rendered, input } = await renderShell(
			item('redo', 'Redo', onSelect, {
				disabled: true,
				disabledReason: 'command-palette.reason.nothing-to-redo',
			})
		)
		type(input, 'redo')
		await rendered.findByText('Nothing to redo')
		press(input, 'Enter')
		expect(onSelect).not.toHaveBeenCalled()
	})

	it('hides disabled items on an empty query', async () => {
		const { rendered } = await renderShell(
			<>
				{item('alpha', 'Alpha')}
				{item('redo', 'Redo', vi.fn(), { disabled: true })}
			</>
		)
		await rendered.findByTestId('command-palette.item.alpha')
		expect(rendered.queryByTestId('command-palette.item.redo')).toBeNull()
	})

	it('fades the list while there is more content below', async () => {
		const { rendered } = await renderShell(<>{item('alpha', 'Alpha')}</>)
		const list = await rendered.findByRole('listbox')
		const setMetrics = (scrollTop: number) => {
			for (const [key, value] of Object.entries({
				scrollHeight: 500,
				clientHeight: 250,
				scrollTop,
			})) {
				Object.defineProperty(list, key, { configurable: true, value })
			}
			fireEvent.scroll(list)
		}
		expect(list.hasAttribute('data-more')).toBe(false)
		setMetrics(0)
		expect(list.hasAttribute('data-more')).toBe(true)
		setMetrics(250)
		expect(list.hasAttribute('data-more')).toBe(false)
	})

	it("keeps Enter's keyup from reaching the editor after running an item", async () => {
		const { editor, input } = await renderShell(item('alpha', 'Alpha'))
		press(input, 'Enter')
		const keyUp = new KeyboardEvent('keyup', { key: 'Enter', bubbles: true })
		editor.getContainer().dispatchEvent(keyUp)
		expect(editor.wasEventAlreadyHandled(keyUp)).toBe(true)
	})

	it('shows recent items first on an empty query', async () => {
		addCommandPaletteRecent('beta')
		const { rendered } = await renderShell(
			<>
				{item('alpha', 'Alpha')}
				{item('beta', 'Beta')}
			</>
		)
		// Below the pinned feature flags row.
		await waitFor(() =>
			expect(rendered.getAllByRole('option')[1].dataset.testid).toBe('command-palette.recent.beta')
		)
	})

	it('opens a grouped submenu and backs out with Backspace, Escape or its heading', async () => {
		const onClose = vi.fn()
		const { rendered, input } = await renderShell(
			<TldrawUiMenuSubmenu id="many" label="Many">
				{['a', 'b'].map((id) => item(id, `Option ${id}`))}
			</TldrawUiMenuSubmenu>,
			onClose
		)
		const open = async () => {
			fireEvent.click(await rendered.findByTestId('command-palette.submenu.Many'))
			expect(rendered.getByTestId('command-palette.item.b').textContent).toBe('Option b')
		}
		await open()
		type(input, 'b')
		press(input, 'Backspace')
		expect(rendered.queryByTestId('command-palette.back')).not.toBeNull()
		type(input, '')
		press(input, 'Backspace')
		expect(rendered.queryByTestId('command-palette.back')).toBeNull()
		await open()
		press(input, 'Escape')
		expect(rendered.queryByTestId('command-palette.back')).toBeNull()
		expect(onClose).not.toHaveBeenCalled()
		await open()
		fireEvent.click(rendered.getByTestId('command-palette.back'))
		expect(rendered.queryByTestId('command-palette.back')).toBeNull()
	})

	it('asks for text before running a prompt item, falling back to an empty value', async () => {
		const onSubmit = vi.fn()
		const { rendered, input } = await renderShell(
			<CommandPalettePromptItem
				id="new"
				label="New file"
				placeholder="File name"
				onSubmit={onSubmit}
			/>
		)
		fireEvent.click(await rendered.findByTestId('command-palette.item.new'))
		expect(onSubmit).not.toHaveBeenCalled()
		expect(input.placeholder).toBe('File name')
		expect(rendered.getByTestId('command-palette.back').textContent).toBe('New file')
		type(input, ' Plans ')
		expect(rendered.getByTestId('command-palette.item.new').textContent).toBe('New file: Plans')
		press(input, 'Enter')
		expect(onSubmit).toHaveBeenCalledWith('Plans')
	})

	it('backs out of a prompt without submitting', async () => {
		const onSubmit = vi.fn()
		const { rendered, input } = await renderShell(
			<CommandPalettePromptItem
				id="new"
				label="New file"
				placeholder="File name"
				onSubmit={onSubmit}
			/>
		)
		fireEvent.click(await rendered.findByTestId('command-palette.item.new'))
		press(input, 'Escape')
		expect(rendered.queryByTestId('command-palette.back')).toBeNull()
		expect(input.placeholder).not.toBe('File name')
		expect(onSubmit).not.toHaveBeenCalled()
	})

	it('lists submenu items flat when grouping is off', async () => {
		commandPaletteFlags.groupSubmenus.set(false)
		const { rendered } = await renderShell(
			<TldrawUiMenuSubmenu id="many" label="Many">
				{['a', 'b'].map((id) => item(id, `Option ${id}`))}
			</TldrawUiMenuSubmenu>
		)
		expect((await rendered.findByTestId('command-palette.item.b')).textContent).toBe(
			'Many: Option b'
		)
		expect(rendered.queryByTestId('command-palette.submenu.Many')).toBeNull()
	})

	it('lines up every row behind the check slot when a row is checked', async () => {
		const { rendered } = await renderShell(
			<>
				<TldrawUiMenuCheckboxItem id="grid" label="Grid" checked readonlyOk onSelect={vi.fn()} />
				{item('alpha', 'Alpha')}
			</>
		)
		const row = await rendered.findByTestId('command-palette.item.alpha')
		expect(row.querySelector('.tlui-icon')).not.toBeNull()
	})

	it('shows group headings in a wider palette, and one leading slot per row', async () => {
		commandPaletteFlags.showGroupHeadings.set(true)
		commandPaletteFlags.showIcons.set(true)
		const { rendered } = await renderShell(
			<TldrawUiMenuGroup id="edit" label="Edit">
				<TldrawUiMenuItem id="alpha" label="Alpha" iconLeft="plus" onSelect={vi.fn()} />
				{item('beta', 'Beta')}
				<TldrawUiMenuCheckboxItem id="grid" label="Grid" checked readonlyOk onSelect={vi.fn()} />
			</TldrawUiMenuGroup>
		)
		await rendered.findByText('Edit')
		expect(rendered.getByTestId('command-palette').hasAttribute('data-wide')).toBe(true)
		// One leading slot each, shared by the icon and the check.
		for (const id of ['alpha', 'beta', 'grid']) {
			const row = rendered.getByTestId(`command-palette.item.${id}`)
			expect(row.querySelectorAll('.tlui-icon')).toHaveLength(1)
		}
	})

	it('reserves the check slot on every row, even with nothing checked', async () => {
		const { rendered } = await renderShell(item('alpha', 'Alpha'))
		const row = await rendered.findByTestId('command-palette.item.alpha')
		expect(row.querySelector('.tlui-icon')).not.toBeNull()
		commandPaletteFlags.checkmarksOnRight.set(true)
		await waitFor(() => expect(row.querySelector('.tlui-icon')).toBeNull())
	})

	it('puts the checkmark on the left by default and on the right when flagged', async () => {
		const checkbox = (
			<TldrawUiMenuCheckboxItem id="grid" label="Grid" checked readonlyOk onSelect={vi.fn()} />
		)
		const iconFollowsLabel = async (
			rendered: Awaited<ReturnType<typeof renderShell>>['rendered']
		) => {
			const row = await rendered.findByTestId('command-palette.item.grid')
			const icon = row.querySelector('.tlui-icon')!
			const label = row.querySelector('.tlui-command-palette__label')!
			return !!(label.compareDocumentPosition(icon) & Node.DOCUMENT_POSITION_FOLLOWING)
		}
		const left = await renderShell(checkbox)
		expect(await iconFollowsLabel(left.rendered)).toBe(false)
		left.rendered.unmount()
		commandPaletteFlags.checkmarksOnRight.set(true)
		const right = await renderShell(checkbox)
		expect(await iconFollowsLabel(right.rendered)).toBe(true)
	})

	it('ignores Enter while an IME composition is in progress', async () => {
		const onSelect = vi.fn()
		const { input } = await renderShell(item('alpha', 'Alpha', onSelect))
		type(input, 'alp')
		press(input, 'Enter', { isComposing: true })
		expect(onSelect).not.toHaveBeenCalled()
		press(input, 'Enter', { keyCode: 229 })
		expect(onSelect).not.toHaveBeenCalled()
	})

	it('keeps focus on the input when a row, heading or empty area is pressed', async () => {
		const { rendered } = await renderShell(
			<TldrawUiMenuSubmenu id="many" label="Many">
				{['a', 'b', 'c', 'd', 'e', 'f'].map((id) => item(id, `Option ${id}`))}
			</TldrawUiMenuSubmenu>
		)
		const submenu = await rendered.findByTestId('command-palette.submenu.Many')
		expect(fireEvent.mouseDown(submenu)).toBe(false)
		expect(fireEvent.mouseDown(rendered.getByRole('listbox'))).toBe(false)
	})

	it('refocuses the input after expanding a submenu row', async () => {
		const { rendered, input } = await renderShell(
			<TldrawUiMenuSubmenu id="many" label="Many">
				{['a', 'b', 'c', 'd', 'e', 'f'].map((id) => item(id, `Option ${id}`))}
			</TldrawUiMenuSubmenu>
		)
		const submenu = await rendered.findByTestId('command-palette.submenu.Many')
		;(document.activeElement as HTMLElement).blur()
		fireEvent.click(submenu)
		expect(document.activeElement).toBe(input)
	})

	it('closes on Escape, on Cmd+K and on a click outside', async () => {
		const onClose = vi.fn()
		const { rendered, input } = await renderShell(item('alpha', 'Alpha'), onClose)
		press(input, 'Escape')
		press(input, 'k', { metaKey: true })
		fireEvent.pointerDown(rendered.getByTestId('command-palette'))
		expect(onClose).toHaveBeenCalledTimes(2)
		fireEvent.pointerDown(rendered.getByTestId('command-palette').parentElement!)
		expect(onClose).toHaveBeenCalledTimes(3)
	})

	it('returns focus to the editor after running an item', async () => {
		const { editor, input } = await renderShell(item('alpha', 'Alpha'))
		expect(document.activeElement).toBe(input)
		type(input, 'alp')
		press(input, 'Enter')
		expect(document.activeElement).toBe(editor.getContainer())
	})

	it('returns focus to the editor after Escape and after Cmd+K', async () => {
		const { editor, input } = await renderShell(item('alpha', 'Alpha'))
		press(input, 'Escape')
		expect(document.activeElement).toBe(editor.getContainer())
		input.focus()
		press(input, 'k', { metaKey: true })
		expect(document.activeElement).toBe(editor.getContainer())
	})

	it('returns focus to the editor after a click outside', async () => {
		const { editor, rendered } = await renderShell(item('alpha', 'Alpha'))
		fireEvent.pointerDown(rendered.getByTestId('command-palette').parentElement!)
		expect(document.activeElement).toBe(editor.getContainer())
	})

	it('scrolls the newly active option into view on keyboard moves but not on hover', async () => {
		const scrollIntoView = vi.fn()
		const original = Element.prototype.scrollIntoView
		Element.prototype.scrollIntoView = scrollIntoView
		try {
			const { rendered, input } = await renderShell(
				<>
					{item('alpha', 'Alpha')}
					{item('beta', 'Beta')}
				</>
			)
			await rendered.findByTestId('command-palette.item.beta')
			scrollIntoView.mockClear()
			press(input, 'ArrowDown')
			expect(scrollIntoView).toHaveBeenCalledTimes(1)
			expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })
			expect(scrollIntoView.mock.contexts[0]).toBe(
				rendered.getByTestId('command-palette.item.alpha')
			)
			scrollIntoView.mockClear()
			fireEvent.pointerMove(rendered.getByTestId('command-palette.item.beta'))
			await waitFor(() =>
				expect(rendered.getByTestId('command-palette.item.beta').dataset.highlighted).toBe('true')
			)
			expect(scrollIntoView).not.toHaveBeenCalled()
		} finally {
			Element.prototype.scrollIntoView = original
		}
	})
})
