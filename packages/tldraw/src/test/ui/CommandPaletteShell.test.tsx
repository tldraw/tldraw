import { act, fireEvent, render, waitFor, within } from '@testing-library/react'
import { createShapeId, deleteFromLocalStorage, Editor, useValue } from '@tldraw/editor'
import { ReactNode, StrictMode, useEffect, useState } from 'react'
import { onTestFinished, vi } from 'vitest'
import { Tldraw } from '../../lib/Tldraw'
import {
	CommandPaletteOnDemand,
	CommandPalettePinned,
	useCommandPaletteActiveItemId,
	useCommandPaletteQuery,
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
import { TldrawUiContextProvider } from '../../lib/ui/context/TldrawUiContextProvider'
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

/**
 * jsdom has no layout: give the listbox a 250px viewport over 50px `rows`, with a scrollTop a
 * browser would clamp to what the rows can hold (or to a fixed `scrollHeight`). `layout` patches
 * row measuring until the test ends: 'stacked' places rows one after another and makes
 * scrollIntoView act like block: 'nearest'; 'in-view' reads every row as in view, so only a
 * restore moves the list, and makes scrollIntoView act like 'nearest' on a list scrolled past
 * its first row.
 */
function mockListLayout(
	list: HTMLElement,
	{
		rows = () => within(list).queryAllByRole('option'),
		scrollHeight,
		layout,
	}: { rows?(): Element[]; scrollHeight?: number; layout?: 'stacked' | 'in-view' } = {}
) {
	const top = (el: Element) => rows().indexOf(el) * 50
	const maxScroll = () =>
		scrollHeight === undefined ? Math.max(0, rows().length * 50 - 250) : scrollHeight - 250
	let scrollTop = 0
	Object.defineProperties(list, {
		scrollHeight: { configurable: true, get: () => maxScroll() + 250 },
		clientHeight: { configurable: true, value: 250 },
		scrollTop: {
			configurable: true,
			get: () => (scrollTop = Math.min(scrollTop, maxScroll())),
			set: (value: number) => (scrollTop = Math.max(0, Math.min(value, maxScroll()))),
		},
	})
	if (!layout) return { top }

	const originalRect = Element.prototype.getBoundingClientRect
	const originalScroll = Element.prototype.scrollIntoView
	onTestFinished(() => {
		Element.prototype.getBoundingClientRect = originalRect
		Element.prototype.scrollIntoView = originalScroll
	})
	if (layout === 'stacked') {
		Element.prototype.getBoundingClientRect = function () {
			const y = this === list ? 0 : top(this) - list.scrollTop
			return { top: y, bottom: y + (this === list ? 250 : 50) } as DOMRect
		}
		Element.prototype.scrollIntoView = function () {
			const y = top(this) - list.scrollTop
			if (y < 0) list.scrollTop += y
			else if (y + 50 > 250) list.scrollTop += y + 50 - 250
		}
	} else {
		Element.prototype.getBoundingClientRect = function () {
			return { top: 0, bottom: this === list ? 250 : 50 } as DOMRect
		}
		Element.prototype.scrollIntoView = () => {
			list.scrollTop = 0
		}
	}
	return { top }
}

describe('CommandPaletteShell', () => {
	it('keeps only options and groups inside the listbox, with the empty message outside', async () => {
		addCommandPaletteRecent('alpha')
		const { rendered, input } = await renderShell(
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
		const listbox = await rendered.findByRole('listbox')
		const recent = await within(listbox).findByRole('group', { name: 'Recent' })
		expect(within(recent).getByRole('option', { name: /Alpha/ })).toBeTruthy()
		expect(
			Array.from(listbox.children).every((child) =>
				['group', 'option'].includes(child.getAttribute('role')!)
			)
		).toBe(true)
		// No empty group where a separator meets a heading.
		expect(
			Array.from(listbox.children).map((group) => group.querySelectorAll('[role="option"]').length)
		).toEqual([1, 1, 1])

		type(input, 'zzzzqqq')
		const noResults = await rendered.findByText('No results')
		expect(listbox.contains(noResults)).toBe(false)
		expect(listbox.children).toHaveLength(0)
	})

	it('closes before running the highlighted item on Enter, records it and returns focus to the editor', async () => {
		const calls: string[] = []
		const { editor, input } = await renderShell(
			item(
				'alpha',
				'Alpha',
				vi.fn(() => calls.push('select'))
			),
			() => calls.push('close')
		)
		expect(document.activeElement).toBe(input)
		type(input, 'alp')
		press(input, 'Enter')
		expect(calls).toEqual(['close', 'select'])
		expect(getCommandPaletteRecents()).toEqual(['alpha'])
		expect(document.activeElement).toBe(editor.getContainer())
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

	it('leaves disabled items out while browsing, and lists them last and greyed in search', async () => {
		const onRedo = vi.fn()
		const { rendered, input } = await renderShell(
			<>
				{item('redraw', 'Redo disabled', onRedo, { disabled: true })}
				{item('redo', 'Redo')}
				{item('alpha', 'Alpha')}
			</>
		)
		await rendered.findByTestId('command-palette.item.alpha')
		expect(rendered.queryByTestId('command-palette.item.redraw')).toBeNull()
		type(input, 'redo')
		await rendered.findByTestId('command-palette.item.redraw')
		const options = () => rendered.getAllByRole('option').map((el) => el.dataset.testid)
		expect(options()).toEqual(['command-palette.item.redo', 'command-palette.item.redraw'])
		const disabledRow = rendered.getByTestId('command-palette.item.redraw')
		expect(disabledRow.getAttribute('aria-disabled')).toBe('true')
		// Not reachable with the keys, the pointer or a click.
		press(input, 'ArrowDown')
		expect(rendered.getByTestId('command-palette.item.redo').dataset.highlighted).toBe('true')
		fireEvent.pointerMove(disabledRow)
		expect(disabledRow.dataset.highlighted).toBeUndefined()
		fireEvent.click(disabledRow)
		type(input, 'redo dis')
		await waitFor(() => expect(options()).toEqual(['command-palette.item.redraw']))
		press(input, 'Enter')
		expect(onRedo).not.toHaveBeenCalled()
	})

	it.each([
		[undefined, 'bottom'],
		['top', 'top'],
	] as const)('opens at position %s on the %s', async (position, expected) => {
		const { rendered } = await renderShell(item('alpha', 'Alpha'), vi.fn(), { position })
		expect(rendered.getByTestId('command-palette').dataset.position).toBe(expected)
	})

	describe('bottom position', () => {
		// jsdom has no layout: give the toolbar a box, and everything else the 1000px-tall container's.
		async function renderWithToolbar(
			orientation: 'horizontal' | 'vertical',
			children: ReactNode = item('alpha', 'Alpha')
		) {
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
			const { editor, rendered } = await renderTldrawComponentWithEditor(
				(onMount) => (
					<Tldraw
						onMount={onMount}
						components={{ Toolbar: () => <DefaultToolbar orientation={orientation} /> }}
					>
						<CommandPaletteShell position="bottom" onClose={vi.fn()}>
							{children}
						</CommandPaletteShell>
					</Tldraw>
				),
				{ waitForPatterns: false }
			)
			await rendered.findByTestId('command-palette.item.alpha')
			expect(rendered.container.querySelector(`.tlui-main-toolbar--${orientation}`)).not.toBeNull()
			return { editor, palette: rendered.getByTestId('command-palette') }
		}

		afterEach(() => {
			vi.restoreAllMocks()
		})

		it('sits above a horizontal toolbar at its width', async () => {
			const { palette } = await renderWithToolbar('horizontal')
			await waitFor(() => expect(palette.style.width).toBe('500px'))
		})

		it('caps a submenu at the browsing height so it stays above the toolbar', async () => {
			vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(
				function (this: HTMLElement) {
					return this.classList.contains('tlui-command-palette') ? 300 : 0
				}
			)
			const { palette } = await renderWithToolbar(
				'horizontal',
				<>
					{item('alpha', 'Alpha')}
					<TldrawUiMenuSubmenu id="many" label="Many">
						{['a', 'b'].map((id) => item(id, `Option ${id}`))}
					</TldrawUiMenuSubmenu>
				</>
			)
			// 8px above the toolbar's top, at 940px.
			await waitFor(() => expect(palette.style.top).toBe('632px'))
			expect(palette.style.maxHeight).toBe('')
			fireEvent.click(within(palette).getByTestId('command-palette.submenu.Many'))
			await within(palette).findByTestId('command-palette.back')
			expect(palette.style.top).toBe('632px')
			expect(palette.style.maxHeight).toBe('300px')
		})

		it('leaves the toolbar for the top on touch devices', async () => {
			const { editor, palette } = await renderWithToolbar('horizontal')
			await waitFor(() => expect(palette.style.width).toBe('500px'))
			act(() => editor.updateInstanceState({ isCoarsePointer: true }))
			await waitFor(() => expect(palette.style.width).toBe(''))
			expect(palette.style.top).toBe('')
		})

		it('ignores a vertical toolbar', async () => {
			const { palette } = await renderWithToolbar('vertical')
			expect(palette.style.width).toBe('')
			expect(palette.style.top).toBe('')
		})
	})

	it('keeps the scroll position when backing out of a submenu or a prompt', async () => {
		const { rendered, input } = await renderShell(
			<>
				{['a', 'b', 'c'].map((id) => item(id, `Item ${id}`))}
				<TldrawUiMenuSubmenu id="many" label="Many">
					{['x', 'y'].map((id) => item(id, `Option ${id}`))}
					<CommandPalettePromptItem id="new" label="New" placeholder="Name" onSubmit={vi.fn()} />
				</TldrawUiMenuSubmenu>
			</>
		)
		const list = await rendered.findByRole('listbox')
		mockListLayout(list, { scrollHeight: 500, layout: 'in-view' })
		const scrollTo = (scrollTop: number) => {
			list.scrollTop = scrollTop
			fireEvent.scroll(list)
		}

		scrollTo(250)
		fireEvent.click(await rendered.findByTestId('command-palette.submenu.Many'))
		expect(list.scrollTop).toBe(0)
		expect(list.hasAttribute('data-more')).toBe(true)
		scrollTo(100)
		fireEvent.click(rendered.getByTestId('command-palette.item.new'))
		expect(list.scrollTop).toBe(0)

		press(input, 'Escape')
		expect(rendered.queryByTestId('command-palette.back')).not.toBeNull()
		expect(list.scrollTop).toBe(100)
		press(input, 'Escape')
		expect(rendered.queryByTestId('command-palette.back')).toBeNull()
		expect(list.scrollTop).toBe(250)
		expect(list.hasAttribute('data-more')).toBe(false)
	})

	it('keeps the scroll position when backing out to rows that register a commit late', async () => {
		// Rows from useCommandPaletteQuery register in their own layout effects, so the shell only
		// lists them on the render after the query comes back.
		function Results() {
			const query = useCommandPaletteQuery()
			if (!query) return null
			return <>{['0', '1', '2', '3', '4', '5', '6', '7'].map((n) => item(`row${n}`, `Row ${n}`))}</>
		}
		const { rendered, input } = await renderShell(
			<>
				<Results />
				<TldrawUiMenuSubmenu id="rows" label="Rows">
					{['x', 'y'].map((id) => item(id, `Option ${id}`))}
				</TldrawUiMenuSubmenu>
			</>
		)
		const list = await rendered.findByRole('listbox')
		mockListLayout(list)

		type(input, 'row')
		await rendered.findByTestId('command-palette.item.row7')
		list.scrollTop = 150
		fireEvent.scroll(list)
		fireEvent.click(rendered.getByTestId('command-palette.submenu.Rows'))
		expect(list.scrollTop).toBe(0)

		press(input, 'Escape')
		expect(rendered.queryByTestId('command-palette.back')).toBeNull()
		expect(list.scrollTop).toBe(150)
	})

	// Without a trailing group, the list gets too short for the saved scroll and it never applies.
	it.each([true, false])(
		'scrolls the active row into view when the restored scroll would hide it (trailing group: %s)',
		async (hasTrailingGroup) => {
			let removeEdit = () => {}
			function Rows() {
				const [hasEdit, setHasEdit] = useState(true)
				removeEdit = () => setHasEdit(false)
				return (
					<>
						{hasEdit && (
							<TldrawUiMenuGroup id="edit" label="menu.edit">
								{item('a1', 'A1')}
								{item('a2', 'A2')}
							</TldrawUiMenuGroup>
						)}
						<TldrawUiMenuGroup id="view" label="menu.view">
							{['1', '2', '3', '4', '5', '6', '7', '8'].map((n) => item(`b${n}`, `B${n}`))}
						</TldrawUiMenuGroup>
						{hasTrailingGroup && (
							<TldrawUiMenuGroup id="extras" label="menu.extras">
								{item('c1', 'C1')}
								{item('c2', 'C2')}
							</TldrawUiMenuGroup>
						)}
						<TldrawUiMenuSubmenu id="many" label="Many">
							{['x', 'y'].map((id) => item(id, `Option ${id}`))}
						</TldrawUiMenuSubmenu>
					</>
				)
			}
			const { rendered, input } = await renderShell(<Rows />)
			const list = await rendered.findByRole('listbox')
			await rendered.findByTestId('command-palette.item.b8')
			// Headings take a 50px slot too.
			const { top } = mockListLayout(list, {
				rows: () =>
					Array.from(list.querySelectorAll('[role="option"], .tlui-command-palette__heading')),
				layout: 'stacked',
			})

			for (let i = 0; i < 5; i++) press(input, 'ArrowDown')
			const active = () => list.querySelector('[data-highlighted]')!
			list.scrollTop = top(active())
			fireEvent.scroll(list)
			expect(list.scrollTop).toBeGreaterThan(0)

			fireEvent.click(rendered.getByTestId('command-palette.submenu.Many'))
			act(() => removeEdit())
			press(input, 'Escape')
			expect(rendered.queryByTestId('command-palette.back')).toBeNull()
			const y = top(active()) - list.scrollTop
			expect(y).toBeGreaterThanOrEqual(0)
			expect(y + 50).toBeLessThanOrEqual(250)
		}
	)

	it('keeps the exact scroll when backing out to a partly clipped active row', async () => {
		const { rendered, input } = await renderShell(
			<>
				{['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => item(`i${n}`, `I${n}`))}
				<TldrawUiMenuSubmenu id="many" label="Many">
					{['x', 'y'].map((id) => item(id, `Option ${id}`))}
				</TldrawUiMenuSubmenu>
			</>
		)
		const list = await rendered.findByRole('listbox')
		const { top } = mockListLayout(list, { layout: 'stacked' })

		for (let i = 0; i < 3; i++) press(input, 'ArrowDown')
		const active = () => list.querySelector('[data-highlighted]')!
		list.scrollTop = top(active()) + 20
		fireEvent.scroll(list)
		const saved = list.scrollTop

		fireEvent.click(rendered.getByTestId('command-palette.submenu.Many'))
		press(input, 'Escape')
		expect(rendered.queryByTestId('command-palette.back')).toBeNull()
		expect(list.scrollTop).toBe(saved)
	})

	it.each([false, true])(
		'drops a restore still waiting for rows on pointer move (moved: %s)',
		async (moved) => {
			let setCount = (_count: number) => {}
			function Rows() {
				const [count, set] = useState(10)
				setCount = set
				return <>{Array.from({ length: count }, (_, n) => item(`r${n}`, `R${n}`))}</>
			}
			const { rendered, input } = await renderShell(
				<>
					<Rows />
					<TldrawUiMenuSubmenu id="many" label="Many">
						{['x', 'y'].map((id) => item(id, `Option ${id}`))}
					</TldrawUiMenuSubmenu>
				</>
			)
			const list = await rendered.findByRole('listbox')
			await rendered.findByTestId('command-palette.item.r9')
			mockListLayout(list)

			list.scrollTop = 150
			fireEvent.scroll(list)
			fireEvent.click(rendered.getByTestId('command-palette.submenu.Many'))
			act(() => setCount(2))
			press(input, 'Escape')
			expect(rendered.queryByTestId('command-palette.back')).toBeNull()
			expect(list.scrollTop).toBe(0)

			if (moved) fireEvent.pointerMove(list)
			act(() => setCount(10))
			expect(list.scrollTop).toBe(moved ? 0 : 150)
		}
	)

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

	it("lists pinned groups but leaves out recents while browsing with suggestions 'none', keeping search", async () => {
		addCommandPaletteRecent('beta')
		const { rendered, input } = await renderShell(
			<>
				{item('alpha', 'Alpha')}
				{item('beta', 'Beta')}
				<CommandPalettePinned>
					<TldrawUiMenuGroup id="news" label="News">
						{item('unread', 'Unread thing')}
					</TldrawUiMenuGroup>
				</CommandPalettePinned>
			</>,
			vi.fn(),
			{ suggestions: 'none' }
		)
		await rendered.findByTestId('command-palette.item.beta')
		const palette = within(rendered.getByTestId('command-palette'))
		expect(palette.queryByText('Recent')).toBeNull()
		expect(rendered.queryByTestId('command-palette.recent.beta')).toBeNull()
		expect(rendered.getByTestId('command-palette.item.unread')).toBeTruthy()
		expect(palette.getByText('News')).toBeTruthy()

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
			expect(rendered.queryByTestId('command-palette.back')).not.toBeNull()
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

	it.each([
		{ dir: 'ltr', forward: 'ArrowRight', back: 'ArrowLeft' },
		{ dir: 'rtl', forward: 'ArrowLeft', back: 'ArrowRight' },
	] as const)(
		'opens a submenu with $forward at the end of the input and leaves with $back at its start ($dir)',
		async ({ dir, forward, back }) => {
			mockDir.current = dir
			const { rendered, input } = await renderShell(
				<TldrawUiMenuSubmenu id="many" label="Many">
					{['a', 'b'].map((id) => item(id, `Option ${id}`))}
				</TldrawUiMenuSubmenu>
			)
			const isOpen = () => rendered.queryByTestId('command-palette.back') !== null
			type(input, 'many')
			await rendered.findByTestId('command-palette.submenu.Many')
			input.setSelectionRange(2, 2)
			press(input, forward)
			expect(isOpen()).toBe(false)
			input.setSelectionRange(4, 4)
			press(input, back)
			expect(isOpen()).toBe(false)
			press(input, forward)
			expect(isOpen()).toBe(true)
			type(input, 'b')
			input.setSelectionRange(0, 0)
			press(input, forward)
			expect(isOpen()).toBe(true)
			input.setSelectionRange(1, 1)
			press(input, back)
			expect(isOpen()).toBe(true)
			input.setSelectionRange(0, 0)
			press(input, back)
			expect(isOpen()).toBe(false)
			expect(input.value).toBe('many')
		}
	)

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

	it.each(['its Cancel row', 'Escape'])(
		'backs out of a prompt with %s, without submitting',
		async (via) => {
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
			if (via === 'Escape') press(input, 'Escape')
			else fireEvent.click(rendered.getByTestId('command-palette.item.command-palette-cancel'))
			expect(onSubmit).not.toHaveBeenCalled()
			expect(input.value).toBe('')
			expect(input.placeholder).not.toBe('File name')
			expect(rendered.queryByTestId('command-palette.back')).toBeNull()
		}
	)

	it('gives only checkable rows a check, marked with aria-checked and kept decorative', async () => {
		const { rendered } = await renderShell(
			<>
				<TldrawUiMenuCheckboxItem id="on" label="On" checked readonlyOk onSelect={vi.fn()} />
				<TldrawUiMenuCheckboxItem id="off" label="Off" checked={false} onSelect={vi.fn()} />
				{item('current', 'Current', vi.fn(), { isSelected: true })}
				{item('plain', 'Plain', vi.fn(), { iconLeft: 'plus' })}
				<TldrawUiMenuSubmenu id="language" label="Language">
					<TldrawUiMenuCheckboxItem id="en" label="English" checked readonlyOk onSelect={vi.fn()} />
					{item('de', 'Deutsch', vi.fn(), { iconLeft: 'plus' })}
				</TldrawUiMenuSubmenu>
			</>
		)
		const expectChecks = (checked: Record<string, string | null>) => {
			for (const [id, value] of Object.entries(checked)) {
				const row = rendered.getByTestId(`command-palette.item.${id}`)
				expect(row.getAttribute('aria-checked')).toBe(value)
				// Item icons are left out, so a plain row has none.
				const icon = row.querySelector('.tlui-icon')
				expect(icon?.getAttribute('aria-hidden') ?? null).toBe(value === null ? null : 'true')
			}
		}
		await rendered.findByTestId('command-palette.item.plain')
		expectChecks({ on: 'true', off: 'false', current: 'true', plain: null })
		fireEvent.click(rendered.getByTestId('command-palette.submenu.Language'))
		await rendered.findByTestId('command-palette.item.de')
		expectChecks({ en: 'true', de: null })
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

	it('keeps focus on the input when a row or empty area is pressed, and after expanding a submenu row', async () => {
		const { rendered, input } = await renderShell(
			<TldrawUiMenuSubmenu id="many" label="Many">
				{['a', 'b', 'c', 'd', 'e', 'f'].map((id) => item(id, `Option ${id}`))}
			</TldrawUiMenuSubmenu>
		)
		const submenu = await rendered.findByTestId('command-palette.submenu.Many')
		expect(fireEvent.mouseDown(submenu)).toBe(false)
		expect(fireEvent.mouseDown(rendered.getByRole('listbox'))).toBe(false)
		;(document.activeElement as HTMLElement).blur()
		fireEvent.click(submenu)
		expect(document.activeElement).toBe(input)
	})

	it('closes on Escape and on Cmd+K, returning focus to the editor', async () => {
		const onClose = vi.fn()
		const { editor, rendered, input } = await renderShell(item('alpha', 'Alpha'), onClose)
		press(input, 'Escape')
		expect(onClose).toHaveBeenCalledTimes(1)
		expect(document.activeElement).toBe(editor.getContainer())
		input.focus()
		press(input, 'k', { metaKey: true })
		expect(onClose).toHaveBeenCalledTimes(2)
		expect(document.activeElement).toBe(editor.getContainer())
		fireEvent.pointerDown(rendered.getByTestId('command-palette'))
		expect(onClose).toHaveBeenCalledTimes(2)
	})

	it('stays open for a canvas click while shapes are selected, and closes for any other click', async () => {
		const onClose = vi.fn()
		const { editor, rendered } = await renderShell(item('alpha', 'Alpha'), onClose)
		const canvas = editor.getContainer().querySelector('.tl-canvas')!
		const reached = vi.fn()
		canvas.addEventListener('pointerdown', reached)
		act(() => {
			editor.createShape({ type: 'geo', x: 0, y: 0 })
			editor.selectAll()
		})
		fireEvent.pointerDown(canvas)
		expect(onClose).not.toHaveBeenCalled()
		act(() => editor.selectNone())
		fireEvent.pointerDown(canvas)
		expect(onClose).toHaveBeenCalledTimes(1)
		// Other UI, such as the toolbar, closes it even with a selection.
		act(() => editor.selectAll())
		fireEvent.pointerDown(rendered.container.querySelector('.tlui-main-toolbar')!)
		expect(onClose).toHaveBeenCalledTimes(2)
		// The click goes through every time.
		expect(reached).toHaveBeenCalledTimes(2)
	})

	it('does not record items run from an on-demand submenu', async () => {
		const onSelect = vi.fn()
		const { rendered } = await renderShell(
			<CommandPaletteOnDemand>
				<TldrawUiMenuSubmenu id="news" label="News">
					{item('note', 'Note', onSelect)}
				</TldrawUiMenuSubmenu>
			</CommandPaletteOnDemand>
		)
		fireEvent.click(await rendered.findByTestId('command-palette.submenu.News'))
		fireEvent.click(rendered.getByTestId('command-palette.item.note'))
		expect(onSelect).toHaveBeenCalled()
		expect(getCommandPaletteRecents()).toEqual([])
	})

	it('lists nothing from a submenu with an empty label', async () => {
		const { rendered, input } = await renderShell(
			<>
				{item('alpha', 'Alpha')}
				<CommandPaletteOnDemand>
					<TldrawUiMenuSubmenu id="news" label="">
						{item('note', 'Note')}
					</TldrawUiMenuSubmenu>
				</CommandPaletteOnDemand>
			</>
		)
		await rendered.findByTestId('command-palette.item.alpha')
		expect(rendered.queryByTestId('command-palette.item.note')).toBeNull()
		type(input, 'note')
		await waitFor(() => expect(rendered.queryByRole('option')).toBeNull())
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

	it('takes focus back from the canvas after a click, so typing keeps searching', async () => {
		const { editor, input } = await renderShell(item('alpha', 'Alpha'))
		act(() => editor.getContainer().focus())
		fireEvent.pointerUp(window)
		await waitFor(() => expect(document.activeElement).toBe(input))
	})

	it("leaves focus with a shape's text editor or another open menu after a click", async () => {
		const { editor, input } = await renderShell(item('alpha', 'Alpha'))
		const editing = vi.spyOn(editor, 'getEditingShapeId').mockReturnValue(createShapeId())
		act(() => editor.getContainer().focus())
		fireEvent.pointerUp(window)
		await new Promise((r) => requestAnimationFrame(r))
		expect(document.activeElement).not.toBe(input)
		editing.mockRestore()
		act(() => {
			editor.menus.addOpenMenu('other')
			editor.getContainer().focus()
		})
		fireEvent.pointerUp(window)
		await new Promise((r) => requestAnimationFrame(r))
		expect(document.activeElement).not.toBe(input)
		act(() => editor.menus.deleteOpenMenu('other'))
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

	it('drops a hovered row when the pointer leaves it, but keeps one picked with the keys', async () => {
		const { rendered, input } = await renderShell(
			<>
				{item('alpha', 'Alpha')}
				{item('beta', 'Beta')}
			</>
		)
		const row = (id: string) => rendered.getByTestId(`command-palette.item.${id}`)
		const highlighted = () =>
			['alpha', 'beta'].filter((id) => row(id).dataset.highlighted === 'true')
		await waitFor(() => expect(highlighted()).toEqual(['alpha']))
		fireEvent.pointerMove(row('beta'))
		await waitFor(() => expect(highlighted()).toEqual(['beta']))
		fireEvent.pointerLeave(row('beta'))
		await waitFor(() => expect(highlighted()).toEqual([]))
		press(input, 'ArrowDown')
		await waitFor(() => expect(highlighted()).toEqual(['alpha']))
		fireEvent.pointerLeave(row('alpha'))
		expect(highlighted()).toEqual(['alpha'])
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

	it("runs an item's latest onSelect, and a prompt's latest onSubmit even if it changes while open", async () => {
		const calls: string[] = []
		let setCount = (_n: number) => {}
		function Counter() {
			const [count, _setCount] = useState(0)
			setCount = _setCount
			return (
				<>
					{item(
						'alpha',
						'Alpha',
						vi.fn(() => calls.push(`select ${count}`))
					)}
					<CommandPalettePromptItem
						id="new"
						label="New file"
						placeholder="File name"
						onSubmit={(value) => calls.push(`${value} ${count}`)}
					/>
				</>
			)
		}
		const { rendered, input } = await renderShell(<Counter />)
		await rendered.findByTestId('command-palette.item.alpha')
		act(() => setCount(1))
		type(input, 'alp')
		press(input, 'Enter')
		expect(calls).toEqual(['select 1'])

		type(input, '')
		fireEvent.click(await rendered.findByTestId('command-palette.item.new'))
		act(() => setCount(2))
		type(input, 'Plans')
		press(input, 'Enter')
		expect(calls).toEqual(['select 1', 'Plans 2'])
	})
})

describe('CommandPaletteShell without an editor', () => {
	function renderApp({ strict = false } = {}) {
		const onClose = vi.fn()
		const onSelect = vi.fn()
		const onSubmit = vi.fn()
		function App() {
			const [isOpen, setIsOpen] = useState(false)
			useEffect(() => {
				const onKeyDown = (e: KeyboardEvent) => {
					if (e.metaKey && e.key === 'k') setIsOpen((open) => !open)
				}
				window.addEventListener('keydown', onKeyDown)
				return () => window.removeEventListener('keydown', onKeyDown)
			}, [])
			return (
				<TldrawUiContextProvider>
					<button data-testid="opener" onClick={() => setIsOpen(true)}>
						Open
					</button>
					{isOpen && (
						<CommandPaletteShell
							position="bottom"
							onClose={() => {
								onClose()
								setIsOpen(false)
							}}
						>
							{item('alpha', 'Alpha')}
							{item('gamma', 'Gamma', onSelect)}
							<TldrawUiMenuSubmenu id="more" label="More">
								{['a', 'b'].map((id) => item(id, `Item ${id}`))}
							</TldrawUiMenuSubmenu>
							<CommandPalettePromptItem
								id="rename"
								label="Rename"
								placeholder="Name"
								onSubmit={onSubmit}
							/>
						</CommandPaletteShell>
					)}
				</TldrawUiContextProvider>
			)
		}
		const rendered = render(
			strict ? (
				<StrictMode>
					<App />
				</StrictMode>
			) : (
				<App />
			)
		)
		const open = async () => {
			const opener = rendered.getByTestId('opener')
			opener.focus()
			fireEvent.click(opener)
			const input = (await rendered.findByTestId('command-palette.input')) as HTMLInputElement
			await rendered.findByTestId('command-palette.item.gamma')
			expect(document.activeElement).toBe(input)
			return { opener, input }
		}
		return { rendered, open, onClose, onSelect, onSubmit }
	}

	it('filters, runs the item on Enter, closes and gives focus back', async () => {
		const { rendered, open, onClose, onSelect } = renderApp()
		const { opener, input } = await open()
		expect(rendered.getByTestId('command-palette.submenu.More')).toBeTruthy()
		type(input, 'gam')
		expect(rendered.queryByTestId('command-palette.item.alpha')).toBeNull()
		press(input, 'Enter')
		expect(onSelect).toHaveBeenCalledWith('command-palette')
		expect(onClose).toHaveBeenCalledTimes(1)
		await waitFor(() => expect(rendered.queryByTestId('command-palette')).toBeNull())
		expect(document.activeElement).toBe(opener)
	})

	it('closes on a click outside', async () => {
		const { rendered, open, onClose } = renderApp()
		await open()
		const overlay = rendered.getByTestId('command-palette').parentElement!
		expect(overlay.hasAttribute('data-passthrough')).toBe(false)
		fireEvent.pointerDown(overlay)
		expect(onClose).toHaveBeenCalledTimes(1)
	})

	// Cmd+K also checks the app's own Cmd+K handler doesn't reopen it.
	it.each([
		{ name: 'Escape', key: 'Escape', init: {}, strict: false },
		{ name: 'Cmd+K', key: 'k', init: { metaKey: true }, strict: false },
		{ name: 'Escape under StrictMode', key: 'Escape', init: {}, strict: true },
	])('closes on $name and gives focus back', async ({ key, init, strict }) => {
		const { rendered, open, onClose, onSelect } = renderApp({ strict })
		const { opener, input } = await open()
		press(input, key, init)
		expect(onClose).toHaveBeenCalledTimes(1)
		expect(onSelect).not.toHaveBeenCalled()
		await waitFor(() => expect(rendered.queryByTestId('command-palette')).toBeNull())
		expect(document.activeElement).toBe(opener)
	})

	it('closes once after submitting a prompt', async () => {
		const { rendered, open, onClose, onSubmit } = renderApp()
		const { input } = await open()
		fireEvent.click(rendered.getByTestId('command-palette.item.rename'))
		type(input, 'Plans')
		press(input, 'Enter')
		expect(onSubmit).toHaveBeenCalledWith('Plans')
		expect(onClose).toHaveBeenCalledTimes(1)
	})
})
