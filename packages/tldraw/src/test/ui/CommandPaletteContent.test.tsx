import { act, fireEvent, waitFor } from '@testing-library/react'
import { Box, createShapeId, deleteFromLocalStorage, TLImageShape } from '@tldraw/editor'
import { ReactNode } from 'react'
import { vi } from 'vitest'
import { Tldraw } from '../../lib/Tldraw'
import { CommandPaletteActionGroup } from '../../lib/ui/components/CommandPalette/CommandPaletteGroups'
import { CommandPaletteToolsGroup } from '../../lib/ui/components/CommandPalette/CommandPaletteGroups'
import { CommandPaletteShell } from '../../lib/ui/components/CommandPalette/CommandPaletteShell'
import { DefaultCommandPaletteContent } from '../../lib/ui/components/CommandPalette/DefaultCommandPaletteContent'
import { TldrawUiMenuActionItem } from '../../lib/ui/components/primitives/menus/TldrawUiMenuActionItem'
import { TldrawUiMenuGroup } from '../../lib/ui/components/primitives/menus/TldrawUiMenuGroup'
import { TLUiActionsContextType, useActions } from '../../lib/ui/context/actions'
import { TLUiOverrides } from '../../lib/ui/overrides'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

vi.mock('../../lib/ui/hooks/useTranslation/useTranslation', async () =>
	vi.importActual('../../lib/ui/hooks/useTranslation/useTranslation')
)

afterEach(() => {
	deleteFromLocalStorage('tldraw-command-palette-recents')
	deleteFromLocalStorage('minimap')
})

async function renderPalette({
	maxPages,
	onUiEvent,
	overrides,
	content = <DefaultCommandPaletteContent />,
}: {
	maxPages?: number
	onUiEvent?(name: string, data: unknown): void
	overrides?: TLUiOverrides
	content?: ReactNode
} = {}) {
	const { editor, rendered } = await renderTldrawComponentWithEditor(
		(onMount) => (
			<Tldraw
				onMount={onMount}
				onUiEvent={onUiEvent}
				overrides={overrides}
				options={maxPages === undefined ? undefined : { maxPages }}
			>
				<CommandPaletteShell onClose={() => {}}>{content}</CommandPaletteShell>
			</Tldraw>
		),
		{ waitForPatterns: false }
	)
	const input = (await rendered.findByTestId('command-palette.input')) as HTMLInputElement
	const search = (value: string) => fireEvent.change(input, { target: { value } })
	const enter = () => fireEvent.keyDown(input, { key: 'Enter' })
	return { editor, rendered, input, search, enter }
}

describe('default command palette content', () => {
	it('lists frame commands only while a frame is selected', async () => {
		const { editor, rendered, search } = await renderPalette()
		search('remove frame')
		await rendered.findByTestId('command-palette.input')
		expect(rendered.queryByTestId('command-palette.item.remove-frame')).toBeNull()
		act(() => {
			editor.createShapes([{ type: 'frame', x: 400, y: 0 }])
			editor.select(editor.getCurrentPageShapes().find((shape) => shape.type === 'frame')!)
		})
		await rendered.findByTestId('command-palette.item.remove-frame')
	})

	it('aligns two selected shapes, and only then lists align', async () => {
		const { editor, search, enter, rendered } = await renderPalette()
		const a = createShapeId()
		const b = createShapeId()
		search('align left')
		await rendered.findByTestId('command-palette.input')
		expect(rendered.queryByTestId('command-palette.item.align-left')).toBeNull()
		act(() => {
			editor.createShapes([
				{ id: a, type: 'geo', x: 0, y: 0 },
				{ id: b, type: 'geo', x: 200, y: 300 },
			])
			editor.select(a, b)
		})
		search('align left')
		await rendered.findByTestId('command-palette.item.align-left')
		enter()
		expect(editor.getShape(a)!.x).toBe(editor.getShape(b)!.x)
	})

	it('labels moving the selection to a new page', async () => {
		const { editor, search, rendered } = await renderPalette()
		act(() => {
			editor.createShapes([{ type: 'geo', x: 0, y: 0 }])
			editor.selectAll()
		})
		search('move to page new')
		expect(
			(await rendered.findByTestId('command-palette.item.move-to-new-page')).textContent
		).toContain('Move to page: New page')
	})

	it('prefixes submenu items with their submenu and finds them by either part', async () => {
		const { rendered, search } = await renderPalette()
		search('theme dark')
		expect(
			(await rendered.findByTestId('command-palette.item.color-scheme-dark')).textContent
		).toContain('Theme: Dark')
		search('dark')
		expect(rendered.getAllByRole('option')[0].textContent).toContain('Theme: Dark')
	})

	it('collapses the language list into a submenu that lists languages by name', async () => {
		const { rendered, input } = await renderPalette()
		fireEvent.click(await rendered.findByTestId('command-palette.submenu.Language'))
		expect(input.value).toBe('')
		// The header also shows the Esc hint.
		expect(rendered.getByTestId('command-palette.back').textContent).toBe('LanguageEsc')
		expect((await rendered.findByTestId('command-palette.item.language-de')).textContent).toBe(
			'Deutsch'
		)
	})

	it('lists tools after the commands, leaving out the current one and asset and embed', async () => {
		const { rendered } = await renderPalette()
		const rectangle = await rendered.findByTestId('command-palette.item.rectangle')
		const ids = rendered.getAllByRole('option').map((option) => option.dataset.testid)
		expect(ids.indexOf('command-palette.item.export-as-svg')).toBeLessThan(
			ids.indexOf(rectangle.dataset.testid)
		)
		expect(rendered.queryByTestId('command-palette.item.select')).toBeNull()
		expect(rendered.queryByTestId('command-palette.item.asset')).toBeNull()
		expect(rendered.queryByTestId('command-palette.item.embed')).toBeNull()
		await rendered.findByTestId('command-palette.item.insert-media')
	})

	it('lists tools when the tools group is rendered', async () => {
		const { rendered } = await renderTldrawComponentWithEditor(
			(onMount) => (
				<Tldraw onMount={onMount}>
					<CommandPaletteShell onClose={() => {}}>
						<CommandPaletteToolsGroup />
					</CommandPaletteShell>
				</Tldraw>
			),
			{ waitForPatterns: false }
		)
		await rendered.findByTestId('command-palette.item.rectangle')
	})

	it('hides the pages group when the editor allows one page', async () => {
		const { rendered, search } = await renderPalette({ maxPages: 1 })
		search('new page')
		expect(rendered.queryByTestId('command-palette.item.new-page')).toBeNull()
	})

	it('leaves out editing commands in readonly mode', async () => {
		const { editor, rendered, search } = await renderPalette()
		act(() => {
			editor.createShapes([{ type: 'geo', x: 0, y: 0 }])
			editor.selectAll()
		})
		search('delete')
		await rendered.findByTestId('command-palette.item.delete')
		act(() => editor.updateInstanceState({ isReadonly: true }))
		await waitFor(() => expect(rendered.queryByTestId('command-palette.item.delete')).toBeNull())
	})

	it('reports the palette as the event source', async () => {
		const onUiEvent = vi.fn()
		const { search, enter, rendered } = await renderPalette({ onUiEvent })
		search('dark')
		await rendered.findByTestId('command-palette.item.color-scheme-dark')
		enter()
		expect(onUiEvent).toHaveBeenCalledWith('color-scheme', {
			source: 'command-palette',
			value: 'dark',
		})
	})

	it('toggles the minimap, in step with the navigation panel', async () => {
		const { editor, rendered, search, enter } = await renderPalette()
		act(() => editor.updateViewportScreenBounds(new Box(0, 0, 1400, 900)))
		search('minimap')
		await rendered.findByTestId('command-palette.item.toggle-minimap')
		expect(rendered.queryByTestId('minimap.zoom-in')).toBeNull()
		enter()
		await rendered.findByTestId('minimap.zoom-in')
		act(() => editor.updateViewportScreenBounds(new Box(0, 0, 500, 800)))
		search('minimap')
		await waitFor(() =>
			expect(rendered.queryByTestId('command-palette.item.toggle-minimap')).toBeNull()
		)
	})

	it('renames, duplicates and deletes the current page, but not the only one', async () => {
		const { editor, rendered, input, search, enter } = await renderPalette()
		search('rename page')
		enter()
		await waitFor(() => expect(input.value).toBe('Page 1'))
		search('Plans')
		enter()
		expect(editor.getCurrentPage().name).toBe('Plans')
		// The test palette stays open after running, still in the prompt.
		fireEvent.keyDown(input, { key: 'Escape' })

		search('delete page')
		await rendered.findByTestId('command-palette.input')
		expect(rendered.queryByTestId('command-palette.item.delete-page')).toBeNull()

		search('duplicate page')
		enter()
		expect(editor.getPages()).toHaveLength(2)
		search('delete page')
		await rendered.findByTestId('command-palette.item.delete-page')
		enter()
		expect(editor.getPages()).toHaveLength(1)
	})

	it("sets the selection's styles, checking the current value", async () => {
		const { editor, rendered, search, enter } = await renderPalette()
		act(() => {
			editor.createShapes([{ id: createShapeId('box'), type: 'geo', x: 0, y: 0 }])
			editor.select(createShapeId('box'))
		})
		search('color red')
		const red = await rendered.findByTestId('command-palette.item.style-color-red')
		expect(red.textContent).toContain('Color: Red')
		enter()
		expect(editor.getShape(createShapeId('box'))!.props).toMatchObject({ color: 'red' })
		search('dash dashed')
		enter()
		expect(editor.getShape(createShapeId('box'))!.props).toMatchObject({ dash: 'dashed' })
		// Arrow styles don't apply to a geo shape.
		search('start arrowhead')
		await rendered.findByTestId('command-palette.input')
		expect(rendered.queryByTestId('command-palette.item.style-arrowhead-start-dot')).toBeNull()
	})

	it('offers the image toolbar commands while one image is selected', async () => {
		const { editor, rendered, input, search, enter } = await renderPalette()
		search('crop image')
		await rendered.findByTestId('command-palette.input')
		expect(rendered.queryByTestId('command-palette.item.crop-image')).toBeNull()
		const id = createShapeId('image')
		const image = () => editor.getShape<TLImageShape>(id)!
		act(() => {
			editor.createShapes([
				{ id, type: 'image', x: 0, y: 0, props: { w: 200, h: 100, altText: 'A cat' } },
			])
			editor.select(id)
		})

		search('alternative text')
		enter()
		await waitFor(() => expect(input.value).toBe('A cat'))
		search('A dog')
		enter()
		expect(image().props.altText).toBe('A dog')
		fireEvent.click(rendered.getByTestId('command-palette.item.command-palette-cancel'))

		search('aspect ratio square')
		fireEvent.click(await rendered.findByTestId('command-palette.item.aspect-ratio-square'))
		expect(image().props.w).toBeCloseTo(image().props.h)

		search('crop image')
		enter()
		expect(editor.isIn('select.crop.idle')).toBe(true)
	})

	describe('actions', () => {
		const makeRed = vi.fn()
		const overrides: TLUiOverrides = {
			actions(_editor, actions) {
				actions['make-red'] = {
					id: 'make-red',
					label: 'Make red',
					isEnabled: (editor) => editor.getSelectedShapeIds().length > 0,
					onSelect: makeRed,
				}
				actions['secret'] = { id: 'secret', label: 'Secret', commandPalette: false, onSelect() {} }
				actions['make-blue'] = {
					id: 'make-blue',
					label: 'Make blue',
					commandPalette: { group: 'colors' },
					onSelect() {},
				}
				return actions
			},
		}

		it('places or opts out every built-in action, so the catch-all only gets new ones', async () => {
			let actions: TLUiActionsContextType = {}
			function Probe() {
				actions = useActions()
				return null
			}
			await renderPalette({ content: <Probe /> })
			const unplaced = Object.values(actions)
				.filter((action) => action.commandPalette === undefined)
				.map((action) => action.id)
			expect(unplaced).toEqual([])
		})

		it('lists custom actions in the catch-all, minus opted-out ones', async () => {
			const { rendered, search } = await renderPalette({ overrides })
			await rendered.findByTestId('command-palette.item.make-blue')
			search('secret')
			expect(rendered.queryByTestId('command-palette.item.secret')).toBeNull()
		})

		it('lists a placed custom action only while it is enabled', async () => {
			const { editor, rendered, search, enter } = await renderPalette({
				overrides,
				content: (
					<>
						<TldrawUiMenuGroup id="colors" label="Colors">
							<TldrawUiMenuActionItem actionId="make-red" />
						</TldrawUiMenuGroup>
						<DefaultCommandPaletteContent />
					</>
				),
			})
			search('make red')
			await rendered.findByTestId('command-palette.input')
			expect(rendered.queryByTestId('command-palette.item.make-red')).toBeNull()
			act(() => {
				editor.createShapes([{ type: 'geo', x: 0, y: 0 }])
				editor.selectAll()
			})
			await rendered.findByTestId('command-palette.item.make-red')
			enter()
			expect(makeRed).toHaveBeenCalled()
		})

		it('lists a group where it is placed, and only once', async () => {
			const { rendered } = await renderPalette({
				overrides,
				content: (
					<>
						<CommandPaletteActionGroup group="colors" label="Colors" />
						<DefaultCommandPaletteContent />
					</>
				),
			})
			await rendered.findByTestId('command-palette.item.make-blue')
			const ids = rendered.getAllByRole('option').map((option) => option.dataset.testid)
			expect(ids.filter((id) => id === 'command-palette.item.make-blue')).toHaveLength(1)
			expect(ids.indexOf('command-palette.item.make-blue')).toBeLessThan(
				ids.indexOf('command-palette.item.zoom-in')
			)
		})
	})
})
