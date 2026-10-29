import { act, fireEvent, waitFor, within } from '@testing-library/react'
import { deleteFromLocalStorage, Editor, useValue } from '@tldraw/editor'
import { ReactNode, useState } from 'react'
import { vi } from 'vitest'
import { Tldraw } from '../../lib/Tldraw'
import {
	CommandPaletteCollapsed,
	CommandPalettePinned,
	useCommandPaletteActiveItemId,
	useCommandPaletteStore,
} from '../../lib/ui/components/CommandPalette/CommandPaletteContext'
import { CommandPalettePromptItem } from '../../lib/ui/components/CommandPalette/CommandPalettePromptItem'
import {
	addCommandPaletteRecent,
	getCommandPaletteRecents,
} from '../../lib/ui/components/CommandPalette/commandPaletteRecents'
import {
	CommandPaletteShell,
	TLUiCommandPaletteShellProps,
} from '../../lib/ui/components/CommandPalette/CommandPaletteShell'
import { TldrawUiMenuCheckboxItem } from '../../lib/ui/components/primitives/menus/TldrawUiMenuCheckboxItem'
import { TldrawUiMenuGroup } from '../../lib/ui/components/primitives/menus/TldrawUiMenuGroup'
import { TldrawUiMenuItem } from '../../lib/ui/components/primitives/menus/TldrawUiMenuItem'
import { TldrawUiMenuSubmenu } from '../../lib/ui/components/primitives/menus/TldrawUiMenuSubmenu'
import { DefaultToolbar } from '../../lib/ui/components/Toolbar/DefaultToolbar'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

const mockDir = vi.hoisted(() => ({ current: null as 'ltr' | 'rtl' | null }))

// setupVitest mocks useTranslation to echo keys; these tests assert the English strings.
vi.mock('../../lib/ui/hooks/useTranslation/useTranslation', async () => {
	const actual = await vi.importActual<
		typeof import('../../lib/ui/hooks/useTranslation/useTranslation')
	>('../../lib/ui/hooks/useTranslation/useTranslation')
	return {
		...actual,
		useDirection: () => {
			const dir = actual.useDirection()
			return mockDir.current ?? dir
		},
	}
})

afterEach(() => {
	deleteFromLocalStorage('tldraw-command-palette-recents')
	mockDir.current = null
})

async function renderShell(
	children: ReactNode,
	onClose: () => void = vi.fn(),
	props: Pick<TLUiCommandPaletteShellProps, 'position' | 'suggestions'> = {}
) {
	const { editor, rendered } = await renderTldrawComponentWithEditor(
		(onMount) => (
			<Tldraw onMount={onMount}>
				<CommandPaletteShell {...props} onClose={onClose}>
					{children}
				</CommandPaletteShell>
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

// The editor's own keyup handler marks every keyup it sees, so check before it runs.
function isEnterKeyUpSwallowed(editor: Editor) {
	const container = editor.getContainer()
	let swallowed = false
	const check = (e: Event) => (swallowed = editor.wasEventAlreadyHandled(e))
	container.addEventListener('keyup', check, true)
	container.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }))
	container.removeEventListener('keyup', check, true)
	return swallowed
}

function item(id: string, label: string, onSelect = vi.fn(), extra: object = {}) {
	return <TldrawUiMenuItem key={id} id={id} label={label} onSelect={onSelect} {...extra} />
}

describe('CommandPaletteShell', () => {
	it('heads each group', async () => {
		const { rendered } = await renderShell(
			<>
				<TldrawUiMenuGroup id="edit" label="menu.edit">
					{item('alpha', 'Alpha')}
					{item('beta', 'Beta')}
				</TldrawUiMenuGroup>
				<TldrawUiMenuGroup id="view" label="menu.view">
					{item('gamma', 'Gamma')}
				</TldrawUiMenuGroup>
			</>
		)
		await rendered.findByTestId('command-palette.item.alpha')
		const palette = within(rendered.getByTestId('command-palette'))
		expect(palette.queryByText('Edit')).not.toBeNull()
		expect(palette.queryByText('View')).not.toBeNull()
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
		await waitFor(() => expect(selected()).toBe('command-palette.item.alpha'))
		press(input, 'ArrowUp')
		expect(selected()).toBe('command-palette.item.beta')
		press(input, 'ArrowDown')
		expect(selected()).toBe('command-palette.item.alpha')
		press(input, 'Tab')
		expect(selected()).toBe('command-palette.item.beta')
	})

	it('hides disabled items, both browsing and searching', async () => {
		const { rendered, input } = await renderShell(
			<>
				{item('alpha', 'Alpha')}
				{item('redo', 'Redo', vi.fn(), { disabled: true })}
			</>
		)
		await rendered.findByTestId('command-palette.item.alpha')
		expect(rendered.queryByTestId('command-palette.item.redo')).toBeNull()
		type(input, 'redo')
		await rendered.findByText('No results')
	})

	it('opens in the center by default', async () => {
		const { rendered } = await renderShell(item('alpha', 'Alpha'))
		const palette = rendered.getByTestId('command-palette')
		expect(palette.dataset.position).toBe('center')
		expect(palette.style.top).toBe('')
	})

	it('opens where its position says', async () => {
		const { rendered } = await renderShell(item('alpha', 'Alpha'), vi.fn(), { position: 'top' })
		expect(rendered.getByTestId('command-palette').dataset.position).toBe('top')
	})

	describe('bottom position', () => {
		// jsdom has no layout: give the toolbar a box, and everything else the 1000px-tall container's.
		async function renderWithToolbar(orientation: 'horizontal' | 'vertical') {
			const toolbarBox =
				orientation === 'horizontal'
					? { top: 940, bottom: 988, left: 250, right: 750, width: 500, height: 48 }
					: { top: 8, bottom: 400, left: 8, right: 56, width: 48, height: 392 }
			vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
				function (this: Element) {
					const box = this.classList.contains('tlui-main-toolbar__inner')
						? toolbarBox
						: { top: 0, bottom: 1000, left: 0, right: 1000, width: 1000, height: 1000 }
					return { ...box, x: box.left, y: box.top, toJSON: () => box } as DOMRect
				}
			)
			const { rendered } = await renderTldrawComponentWithEditor(
				(onMount) => (
					<Tldraw
						onMount={onMount}
						components={{ Toolbar: () => <DefaultToolbar orientation={orientation} /> }}
					>
						<CommandPaletteShell position="bottom" onClose={vi.fn()}>
							{item('alpha', 'Alpha')}
						</CommandPaletteShell>
					</Tldraw>
				),
				{ waitForPatterns: false }
			)
			await rendered.findByTestId('command-palette.item.alpha')
			expect(rendered.container.querySelector(`.tlui-main-toolbar--${orientation}`)).not.toBeNull()
			return rendered.getByTestId('command-palette')
		}

		afterEach(() => {
			vi.restoreAllMocks()
		})

		it('sits above a horizontal toolbar at its width', async () => {
			const palette = await renderWithToolbar('horizontal')
			await waitFor(() => expect(palette.style.width).toBe('500px'))
		})

		it('ignores a vertical toolbar', async () => {
			const palette = await renderWithToolbar('vertical')
			expect(palette.style.width).toBe('')
			expect(palette.style.top).toBe('')
		})
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
		expect(isEnterKeyUpSwallowed(editor)).toBe(true)
	})

	it.each([
		['the window blurs', (win: Window) => win.dispatchEvent(new Event('blur'))],
		[
			'a new key press starts',
			(_win: Window, container: HTMLElement) =>
				container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
		],
	])("lets a later Enter keyup through when Enter's own keyup is lost and %s", async (_, lose) => {
		const { editor, input } = await renderShell(item('alpha', 'Alpha'))
		press(input, 'Enter')
		lose(editor.getContainerWindow(), editor.getContainer())
		expect(isEnterKeyUpSwallowed(editor)).toBe(false)
	})

	it('lists pinned groups first, above recents, under their heading', async () => {
		addCommandPaletteRecent('alpha')
		const { rendered } = await renderShell(
			<>
				{item('alpha', 'Alpha')}
				<CommandPalettePinned>
					<TldrawUiMenuGroup id="news" label="News">
						{item('unread', 'Unread thing')}
					</TldrawUiMenuGroup>
				</CommandPalettePinned>
			</>
		)
		await rendered.findByTestId('command-palette.item.unread')
		const ids = rendered.getAllByRole('option').map((option) => option.dataset.testid)
		expect(ids.indexOf('command-palette.item.unread')).toBeLessThan(
			ids.indexOf('command-palette.recent.alpha')
		)
		expect(within(rendered.getByTestId('command-palette')).getByText('News')).toBeTruthy()
	})

	it('shows recent items first on an empty query', async () => {
		addCommandPaletteRecent('beta')
		const { rendered } = await renderShell(
			<>
				{item('alpha', 'Alpha')}
				{item('beta', 'Beta')}
			</>
		)
		await waitFor(() =>
			expect(rendered.getAllByRole('option')[0].dataset.testid).toBe('command-palette.recent.beta')
		)
	})

	it("leaves out recents while browsing with suggestions 'none', keeping pinned items and search", async () => {
		addCommandPaletteRecent('beta')
		const { rendered, input } = await renderShell(
			<>
				{item('alpha', 'Alpha')}
				{item('beta', 'Beta')}
				<CommandPalettePinned>{item('unread', 'Unread thing')}</CommandPalettePinned>
			</>,
			vi.fn(),
			{ suggestions: 'none' }
		)
		await rendered.findByTestId('command-palette.item.beta')
		const palette = within(rendered.getByTestId('command-palette'))
		expect(palette.queryByText('Recent')).toBeNull()
		expect(rendered.queryByTestId('command-palette.recent.beta')).toBeNull()
		expect(rendered.getByTestId('command-palette.item.unread')).toBeTruthy()

		type(input, 'alp')
		await waitFor(() =>
			expect(rendered.getAllByRole('option').map((el) => el.dataset.testid)).toEqual([
				'command-palette.item.alpha',
			])
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
		expect(within(rendered.getByTestId('command-palette.back')).getByText('Esc')).toBeTruthy()
		press(input, 'Escape')
		expect(rendered.queryByTestId('command-palette.back')).toBeNull()
		expect(onClose).not.toHaveBeenCalled()
		await open()
		fireEvent.click(rendered.getByTestId('command-palette.back'))
		expect(rendered.queryByTestId('command-palette.back')).toBeNull()
	})

	it('reports the highlighted item, for previews', async () => {
		const seen: (string | null)[] = []
		function Probe() {
			seen.push(useCommandPaletteActiveItemId())
			return null
		}
		const { input } = await renderShell(
			<>
				<Probe />
				{item('alpha', 'Alpha')}
				{item('beta', 'Beta')}
			</>
		)
		type(input, 'beta')
		await waitFor(() => expect(seen.at(-1)).toBe('beta'))
		type(input, 'alpha')
		await waitFor(() => expect(seen.at(-1)).toBe('alpha'))
		type(input, 'nothing matches this')
		await waitFor(() => expect(seen.at(-1)).toBeNull())
	})

	it('backs out of a submenu to the search it was opened from', async () => {
		const { rendered, input } = await renderShell(
			<>
				{item('menu', 'Many things')}
				<TldrawUiMenuSubmenu id="many" label="Many">
					{['a', 'b'].map((id) => item(id, `Option ${id}`))}
				</TldrawUiMenuSubmenu>
			</>
		)
		const selected = () =>
			rendered.getAllByRole('option').find((el) => el.getAttribute('aria-selected') === 'true')
				?.dataset.testid
		type(input, 'many')
		await waitFor(() => expect(selected()).toBe('command-palette.item.menu'))
		press(input, 'ArrowDown')
		expect(selected()).toBe('command-palette.submenu.Many')
		press(input, 'Enter')
		expect(input.value).toBe('')
		press(input, 'Escape')
		expect(input.value).toBe('many')
		expect(selected()).toBe('command-palette.submenu.Many')
	})

	it('opens a submenu with ArrowRight at the end of the input and leaves with ArrowLeft at its start', async () => {
		const { rendered, input } = await renderShell(
			<TldrawUiMenuSubmenu id="many" label="Many">
				{['a', 'b'].map((id) => item(id, `Option ${id}`))}
			</TldrawUiMenuSubmenu>
		)
		type(input, 'many')
		await rendered.findByTestId('command-palette.submenu.Many')
		input.setSelectionRange(2, 2)
		press(input, 'ArrowRight')
		expect(rendered.queryByTestId('command-palette.back')).toBeNull()
		input.setSelectionRange(4, 4)
		press(input, 'ArrowRight')
		expect(rendered.queryByTestId('command-palette.back')).not.toBeNull()
		type(input, 'b')
		input.setSelectionRange(1, 1)
		press(input, 'ArrowLeft')
		expect(rendered.queryByTestId('command-palette.back')).not.toBeNull()
		input.setSelectionRange(0, 0)
		press(input, 'ArrowLeft')
		expect(rendered.queryByTestId('command-palette.back')).toBeNull()
		expect(input.value).toBe('many')
	})

	it('swaps the submenu arrow keys in RTL', async () => {
		mockDir.current = 'rtl'
		const { rendered, input } = await renderShell(
			<TldrawUiMenuSubmenu id="many" label="Many">
				{['a', 'b'].map((id) => item(id, `Option ${id}`))}
			</TldrawUiMenuSubmenu>
		)
		type(input, 'many')
		await rendered.findByTestId('command-palette.submenu.Many')
		input.setSelectionRange(4, 4)
		press(input, 'ArrowRight')
		expect(rendered.queryByTestId('command-palette.back')).toBeNull()
		input.setSelectionRange(2, 2)
		press(input, 'ArrowLeft')
		expect(rendered.queryByTestId('command-palette.back')).toBeNull()
		input.setSelectionRange(4, 4)
		press(input, 'ArrowLeft')
		expect(rendered.queryByTestId('command-palette.back')).not.toBeNull()
		type(input, 'b')
		input.setSelectionRange(0, 0)
		press(input, 'ArrowLeft')
		expect(rendered.queryByTestId('command-palette.back')).not.toBeNull()
		input.setSelectionRange(1, 1)
		press(input, 'ArrowRight')
		expect(rendered.queryByTestId('command-palette.back')).not.toBeNull()
		input.setSelectionRange(0, 0)
		press(input, 'ArrowRight')
		expect(rendered.queryByTestId('command-palette.back')).toBeNull()
		expect(input.value).toBe('many')
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
		type(input, ' Plans ')
		expect(rendered.getByTestId('command-palette.item.new').textContent).toBe('New file“Plans”')
		press(input, 'Enter')
		expect(onSubmit).toHaveBeenCalledWith('Plans')
	})

	it('prefills a prompt with its initial value, selected so typing replaces it', async () => {
		const onSubmit = vi.fn()
		const { rendered, input } = await renderShell(
			<CommandPalettePromptItem
				id="rename"
				label="Rename file"
				placeholder="File name"
				initialValue="Plans"
				onSubmit={onSubmit}
			/>
		)
		fireEvent.click(await rendered.findByTestId('command-palette.item.rename'))
		expect(input.value).toBe('Plans')
		expect([input.selectionStart, input.selectionEnd]).toEqual([0, 5])
		press(input, 'Enter')
		expect(onSubmit).toHaveBeenCalledWith('Plans')
	})

	it('backs out of a prompt with its Cancel row', async () => {
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
		type(input, 'Plans')
		const cancel = rendered.getByTestId('command-palette.item.command-palette-cancel')
		expect(within(cancel).getByText('Esc')).toBeTruthy()
		fireEvent.click(cancel)
		expect(onSubmit).not.toHaveBeenCalled()
		expect(input.value).toBe('')
		expect(input.placeholder).not.toBe('File name')
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

	it('shows no item icons, and reserves a check slot only in sections with a checkable row', async () => {
		const { rendered } = await renderShell(
			<>
				<TldrawUiMenuGroup id="edit" label="Edit">
					<TldrawUiMenuItem id="alpha" label="Alpha" iconLeft="plus" onSelect={vi.fn()} />
					{item('beta', 'Beta')}
					<TldrawUiMenuCheckboxItem id="grid" label="Grid" checked readonlyOk onSelect={vi.fn()} />
					<TldrawUiMenuSubmenu id="more" label="More">
						{['a', 'b'].map((id) => item(id, `Item ${id}`))}
					</TldrawUiMenuSubmenu>
				</TldrawUiMenuGroup>
				<TldrawUiMenuGroup id="view" label="View">
					<TldrawUiMenuItem id="gamma" label="Gamma" iconLeft="plus" onSelect={vi.fn()} />
				</TldrawUiMenuGroup>
			</>
		)
		await rendered.findByText('Edit')
		const iconCount = (testId: string) =>
			rendered.getByTestId(testId).querySelectorAll('.tlui-icon').length
		for (const id of ['alpha', 'beta', 'grid'])
			expect(iconCount(`command-palette.item.${id}`)).toBe(1)
		// The check slot plus the chevron.
		expect(iconCount('command-palette.submenu.More')).toBe(2)
		expect(iconCount('command-palette.item.gamma')).toBe(0)
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

	it('does not record items run from a collapsed submenu', async () => {
		const onSelect = vi.fn()
		const { rendered } = await renderShell(
			<CommandPaletteCollapsed>
				<TldrawUiMenuSubmenu id="news" label="News">
					{item('note', 'Note', onSelect)}
				</TldrawUiMenuSubmenu>
			</CommandPaletteCollapsed>
		)
		fireEvent.click(await rendered.findByTestId('command-palette.submenu.News'))
		fireEvent.click(rendered.getByTestId('command-palette.item.note'))
		expect(onSelect).toHaveBeenCalled()
		expect(getCommandPaletteRecents()).toEqual([])
	})

	it('returns focus to the editor, without recording a recent, when an item throws', async () => {
		const { editor, input } = await renderShell(
			item(
				'alpha',
				'Alpha',
				vi.fn(() => {
					throw new Error('boom')
				})
			)
		)
		// React reports event handler errors to window instead of rethrowing them.
		const errors: unknown[] = []
		const onError = (e: ErrorEvent) => {
			e.preventDefault()
			errors.push(e.error)
		}
		window.addEventListener('error', onError)
		try {
			type(input, 'alp')
			press(input, 'Enter')
		} finally {
			window.removeEventListener('error', onError)
		}
		expect(errors).toEqual([new Error('boom')])
		expect(document.activeElement).toBe(editor.getContainer())
		expect(getCommandPaletteRecents()).toEqual([])
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
				rendered.getByTestId('command-palette.item.beta')
			)
			scrollIntoView.mockClear()
			fireEvent.pointerMove(rendered.getByTestId('command-palette.item.alpha'))
			await waitFor(() =>
				expect(rendered.getByTestId('command-palette.item.alpha').dataset.highlighted).toBe('true')
			)
			expect(scrollIntoView).not.toHaveBeenCalled()
		} finally {
			Element.prototype.scrollIntoView = original
		}
	})

	it('settles when items re-render every time the palette does', async () => {
		let renders = 0
		function RerendersWithPalette() {
			const store = useCommandPaletteStore()
			useValue(store.entries)
			renders++
			return (
				<>
					{item('alpha', 'Alpha')}
					{item('beta', 'Beta')}
				</>
			)
		}
		const { rendered } = await renderShell(<RerendersWithPalette />)
		await rendered.findByTestId('command-palette.item.beta')
		expect(renders).toBeLessThan(10)
	})

	it("runs a prompt's latest onSubmit, even if it changes while the prompt is open", async () => {
		const calls: string[] = []
		let setCount = (_n: number) => {}
		function Counter() {
			const [count, _setCount] = useState(0)
			setCount = _setCount
			return (
				<CommandPalettePromptItem
					id="new"
					label="New file"
					placeholder="File name"
					onSubmit={(value) => calls.push(`${value} ${count}`)}
				/>
			)
		}
		const { rendered, input } = await renderShell(<Counter />)
		fireEvent.click(await rendered.findByTestId('command-palette.item.new'))
		act(() => setCount(1))
		type(input, 'Plans')
		press(input, 'Enter')
		expect(calls).toEqual(['Plans 1'])
	})

	it('runs the latest onSelect after it changes', async () => {
		const calls: number[] = []
		let setCount = (_n: number) => {}
		function Counter() {
			const [count, _setCount] = useState(0)
			setCount = _setCount
			return item(
				'alpha',
				'Alpha',
				vi.fn(() => calls.push(count))
			)
		}
		const { rendered, input } = await renderShell(<Counter />)
		await rendered.findByTestId('command-palette.item.alpha')
		act(() => setCount(1))
		type(input, 'alp')
		press(input, 'Enter')
		expect(calls).toEqual([1])
	})
})
