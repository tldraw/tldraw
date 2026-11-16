import { act, fireEvent, render, RenderResult, waitFor } from '@testing-library/react'
import { ReactNode } from 'react'
import {
	atom,
	BaseBoxShapeUtil,
	Box,
	createShapeId,
	createTLStore,
	deleteFromLocalStorage,
	Editor,
	GeoShapeGeoStyle,
	T,
	TldrawEditor,
	TLImageShape,
	defaultBindingUtils,
	defaultShapeUtils,
	defaultTools,
	Tldraw,
	TldrawUiMenuActionItem,
	TldrawUiMenuGroup,
	TLUiActionsContextType,
	useActions,
	TLUiOverrides,
	TldrawUi,
} from 'tldraw'
import { vi } from 'vitest'
import { CommandPalette, commandPaletteOverrides } from '../lib/CommandPalette'
import {
	defaultCommandPaletteActionGroups,
	TLUiCommandPaletteActionGroups,
} from '../lib/commandPaletteActionGroups'
import { CommandPaletteActionGroup, CommandPaletteToolsGroup } from '../lib/CommandPaletteGroups'
import { StylePicker, useCommandPaletteStylePickers } from '../lib/CommandPaletteStylesGroup'
import { DefaultCommandPalette } from '../lib/DefaultCommandPalette'
import { DefaultCommandPaletteContent } from '../lib/DefaultCommandPaletteContent'
import { renderTldrawComponentWithEditor } from './renderTldrawComponent'

const commentingEnabled = vi.hoisted(() => ({ value: true }))
vi.mock('tldraw', async (importOriginal) => ({
	...(await importOriginal<typeof import('tldraw')>()),
	useCommentingEnabled: () => commentingEnabled.value,
}))

afterEach(() => {
	commentingEnabled.value = true
	deleteFromLocalStorage('tldraw-command-palette-recents')
	deleteFromLocalStorage('minimap')
})

async function renderPalette({
	maxPages,
	onUiEvent,
	overrides,
	actionGroups,
	content = <DefaultCommandPaletteContent />,
	forceMobile,
}: {
	actionGroups?: TLUiCommandPaletteActionGroups
	forceMobile?: boolean
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
				forceMobile={forceMobile}
				options={maxPages === undefined ? undefined : { maxPages }}
			>
				<DefaultCommandPalette actionGroups={actionGroups} onClose={() => {}}>
					{content}
				</DefaultCommandPalette>
			</Tldraw>
		),
		{ waitForPatterns: false }
	)
	const input = (await rendered.findByTestId('command-palette.input')) as HTMLInputElement
	const search = (value: string) => fireEvent.change(input, { target: { value } })
	const enter = () => fireEvent.keyDown(input, { key: 'Enter' })
	return { editor, rendered, input, search, enter }
}

// Search lists a disabled item greyed out rather than leaving it out.
function expectDisabled(rendered: RenderResult, id: string, disabled: boolean) {
	const row = rendered.getByTestId(`command-palette.item.${id}`)
	expect(row.getAttribute('aria-disabled')).toBe(disabled ? 'true' : null)
}

describe('default command palette content', () => {
	it('collapses the language list into a submenu that lists languages by name', async () => {
		const { rendered, input } = await renderPalette()
		fireEvent.click(await rendered.findByTestId('command-palette.submenu.Language'))
		expect(input.value).toBe('')
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

	it('lists the comment tool only while commenting is enabled', async () => {
		const overrides: TLUiOverrides = {
			tools(_editor, tools) {
				tools.comment = { id: 'comment', icon: 'comment', label: 'tool.comment', onSelect() {} }
				return tools
			},
		}
		const enabled = await renderPalette({ overrides, content: <CommandPaletteToolsGroup /> })
		await enabled.rendered.findByTestId('command-palette.item.comment')
		enabled.rendered.unmount()

		commentingEnabled.value = false
		const disabled = await renderPalette({ overrides, content: <CommandPaletteToolsGroup /> })
		await disabled.rendered.findByTestId('command-palette.item.rectangle')
		expect(disabled.rendered.queryByTestId('command-palette.item.comment')).toBeNull()
	})

	it('hides the pages group when the editor allows one page', async () => {
		const { rendered, search } = await renderPalette({ maxPages: 1 })
		search('new page')
		expect(rendered.queryByTestId('command-palette.item.new-page')).toBeNull()
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

	// The editor re-measures its container every second, and jsdom measures it as ~0 wide, which
	// drops the real breakpoint mid-test on a slow run.
	function pinViewport(editor: Editor, bounds: Box) {
		vi.spyOn(editor, 'updateViewportScreenBounds').mockRestore()
		act(() => editor.updateViewportScreenBounds(bounds))
		vi.spyOn(editor, 'updateViewportScreenBounds').mockImplementation(() => editor)
	}

	it.each([
		{ when: 'on a wide viewport', listed: true },
		{ when: 'when forceMobile hides the minimap', forceMobile: true, listed: false },
		{ when: 'in focus mode', focusMode: true, listed: false },
	])('lists toggle minimap $when: $listed', async ({ forceMobile, focusMode, listed }) => {
		const { editor, rendered, search } = await renderPalette({ forceMobile })
		pinViewport(editor, new Box(0, 0, 1400, 900))
		if (focusMode) act(() => editor.updateInstanceState({ isFocusMode: true }))
		search('minimap')
		await rendered.findByTestId('command-palette.input')
		await waitFor(() =>
			expect(rendered.queryByTestId('command-palette.item.toggle-minimap') !== null).toBe(listed)
		)
	})

	it('toggles the minimap, in step with the navigation panel', async () => {
		const { editor, rendered, search, enter } = await renderPalette()
		pinViewport(editor, new Box(0, 0, 1400, 900))
		search('minimap')
		await rendered.findByTestId('command-palette.item.toggle-minimap')
		expect(rendered.queryByTestId('minimap.zoom-in')).toBeNull()
		enter()
		await rendered.findByTestId('minimap.zoom-in')
		pinViewport(editor, new Box(0, 0, 500, 800))
		search('minimap')
		await waitFor(() =>
			expect(rendered.queryByTestId('command-palette.item.toggle-minimap')).toBeNull()
		)
	})

	it('renames, duplicates and deletes the current page, but not the only one', async () => {
		const { editor, rendered, input, search, enter } = await renderPalette()
		search('rename page')
		expect((await rendered.findByTestId('command-palette.item.rename-page')).textContent).toBe(
			'Rename page'
		)
		enter()
		await waitFor(() => expect(input.value).toBe('Page 1'))
		expect(input.placeholder).toBe('Page name')
		search('Plans')
		enter()
		expect(editor.getCurrentPage().name).toBe('Plans')
		// The test palette stays open after running, still in the prompt.
		fireEvent.keyDown(input, { key: 'Escape' })

		search('delete page')
		await waitFor(() => expectDisabled(rendered, 'delete-page', true))

		search('duplicate page')
		enter()
		expect(editor.getPages()).toHaveLength(2)
		search('delete page')
		await rendered.findByTestId('command-palette.item.delete-page')
		enter()
		expect(editor.getPages()).toHaveLength(1)
	})

	it("sets the selection's styles and opacity, checking the current value", async () => {
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

		search('opacity 50')
		fireEvent.click(await rendered.findByTestId('command-palette.item.style-opacity-0.5'))
		expect(editor.getShape(createShapeId('box'))!.opacity).toBe(0.5)
		await waitFor(() =>
			expect(
				rendered.getByTestId('command-palette.item.style-opacity-0.5').getAttribute('aria-checked')
			).toBe('true')
		)
	})

	it('opens in an editor without the geo shape, on a shape with the geo style', async () => {
		class GeoLikeShapeUtil extends BaseBoxShapeUtil<any> {
			static override type = 'geo-like'
			static override props = { w: T.number, h: T.number, geo: GeoShapeGeoStyle }
			getDefaultProps() {
				return { w: 100, h: 100, geo: 'rectangle' }
			}
			component() {
				return null
			}
			getIndicatorPath() {
				return undefined
			}
		}
		let editor!: Editor
		const rendered = render(
			<TldrawEditor
				shapeUtils={[...defaultShapeUtils.filter((util) => util.type !== 'geo'), GeoLikeShapeUtil]}
				tools={defaultTools}
				initialState="select"
				onMount={(e) => {
					editor = e
				}}
			>
				{/* The style panel's own geo picker needs the geo util too. */}
				<TldrawUi
					components={{ StylePanel: null, CommandPalette }}
					overrides={commandPaletteOverrides}
				/>
			</TldrawEditor>
		)
		await waitFor(() => expect(editor).toBeDefined())
		act(() => {
			const id = createShapeId('geo-like')
			editor.createShapes([{ id, type: 'geo-like' as any, x: 0, y: 0 }])
			editor.select(id)
			editor.updateInstanceState({ isFocused: true })
			editor
				.getContainerDocument()
				.body.dispatchEvent(
					new KeyboardEvent('keydown', { bubbles: true, key: 'k', code: 'KeyK', metaKey: true })
				)
		})
		const input = await rendered.findByTestId('command-palette.input')
		fireEvent.change(input, { target: { value: 'opacity 50' } })
		await rendered.findByTestId('command-palette.item.style-opacity-0.5')
		act(() => editor.selectNone())
		fireEvent.change(input, { target: { value: 'color red' } })
		await rendered.findByTestId('command-palette.item.style-color-red')
	})

	// Styles are open StyleProps, so the pickers are a hand-kept list that a new default style can miss.
	it('has a picker for every style of the default shapes', async () => {
		// Not in the style panel either: labels follow the shape's color.
		const leftOut = new Set(['tldraw:labelColor'])
		const pickers = { current: null as StylePicker[] | null }
		function Probe() {
			pickers.current = useCommandPaletteStylePickers()
			return null
		}
		const setStyleIds = new Set<string>()
		const { editor } = await renderPalette({
			content: <Probe />,
			onUiEvent: (name, data) => {
				if (name === 'set-style') setStyleIds.add((data as { id: string }).id)
			},
		})
		const styleIds = new Set<string>()
		const types = defaultShapeUtils.map((util) => util.type)
		act(() => {
			for (const type of types) {
				const styles = [...editor.styleProps[type].keys()]
				if (styles.length === 0) continue
				for (const style of styles) styleIds.add(style.id)
				editor.createShape({ id: createShapeId(type), type, x: 0, y: 0 })
			}
			editor.selectAll()
		})
		await waitFor(() => expect(pickers.current).not.toBeNull())
		act(() => {
			for (const picker of pickers.current!) picker.onSelect(picker.values[0])
		})
		expect([...setStyleIds].filter((id) => id !== 'opacity').sort()).toEqual(
			[...styleIds].filter((id) => !leftOut.has(id)).sort()
		)
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
				actions['secret'] = { id: 'secret', label: 'Secret', onSelect() {} }
				actions['make-blue'] = { id: 'make-blue', label: 'Make blue', onSelect() {} }
				return actions
			},
		}
		const actionGroups: TLUiCommandPaletteActionGroups = { secret: false, 'make-blue': 'colors' }

		it('groups every built-in action', async () => {
			let actions: TLUiActionsContextType = {}
			function Probe() {
				actions = useActions()
				return null
			}
			// Collaboration and the palette's overrides add the conditional actions.
			const store = createTLStore({
				shapeUtils: defaultShapeUtils,
				bindingUtils: defaultBindingUtils,
				collaboration: { status: atom('status', 'online' as const) },
			})
			await renderTldrawComponentWithEditor(
				(onMount) => (
					<Tldraw store={store} onMount={onMount} overrides={commandPaletteOverrides}>
						<Probe />
					</Tldraw>
				),
				{ waitForPatterns: false }
			)
			expect(actions['open-cursor-chat']).toBeDefined()
			expect(actions['open-command-palette']).toBeDefined()
			// Explicit, so a new built-in action can't land in the catch-all unnoticed.
			expect(
				Object.keys(actions).filter((id) => !(id in defaultCommandPaletteActionGroups))
			).toEqual([])
		})

		it('lists custom actions in the catch-all, minus opted-out ones', async () => {
			const { rendered, search } = await renderPalette({ overrides, actionGroups })
			await rendered.findByTestId('command-palette.item.make-blue')
			search('secret')
			expect(rendered.queryByTestId('command-palette.item.secret')).toBeNull()
		})

		it('enables a placed custom action only while its action is enabled', async () => {
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
			await waitFor(() => expectDisabled(rendered, 'make-red', true))
			act(() => {
				editor.createShapes([{ type: 'geo', x: 0, y: 0 }])
				editor.selectAll()
			})
			await waitFor(() => expectDisabled(rendered, 'make-red', false))
			enter()
			expect(makeRed).toHaveBeenCalled()
		})

		it('lists a group where it is placed, and only once', async () => {
			const { rendered } = await renderPalette({
				overrides,
				actionGroups,
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
