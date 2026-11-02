import { act, fireEvent, render, waitFor } from '@testing-library/react'
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
} from '@tldraw/editor'
import { ReactNode } from 'react'
import { vi } from 'vitest'
import { defaultBindingUtils } from '../../lib/defaultBindingUtils'
import { defaultShapeTools } from '../../lib/defaultShapeTools'
import { defaultShapeUtils } from '../../lib/defaultShapeUtils'
import { defaultTools } from '../../lib/defaultTools'
import { Tldraw } from '../../lib/Tldraw'
import {
	CommandPaletteActionGroup,
	CommandPalettePagesGroup,
	CommandPaletteToolsGroup,
} from '../../lib/ui/components/CommandPalette/CommandPaletteGroups'
import { CommandPalettePromptItem } from '../../lib/ui/components/CommandPalette/CommandPalettePromptItem'
import { CommandPaletteShell } from '../../lib/ui/components/CommandPalette/CommandPaletteShell'
import {
	StylePicker,
	useCommandPaletteStylePickers,
} from '../../lib/ui/components/CommandPalette/CommandPaletteStylesGroup'
import { DefaultCommandPaletteContent } from '../../lib/ui/components/CommandPalette/DefaultCommandPaletteContent'
import { TldrawUiMenuActionItem } from '../../lib/ui/components/primitives/menus/TldrawUiMenuActionItem'
import { TldrawUiMenuGroup } from '../../lib/ui/components/primitives/menus/TldrawUiMenuGroup'
import { TLUiActionsContextType, useActions } from '../../lib/ui/context/actions'
import { TLUiOverrides } from '../../lib/ui/overrides'
import { TldrawUi } from '../../lib/ui/TldrawUi'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

vi.mock('../../lib/ui/hooks/useTranslation/useTranslation', async () =>
	vi.importActual('../../lib/ui/hooks/useTranslation/useTranslation')
)

// setupVitest pins useBreakpoint to desktop; minimap tests opt into the real one.
const realBreakpoint = vi.hoisted(() => ({ value: false }))
vi.mock('../../lib/ui/context/breakpoints', async () => {
	const actual = await vi.importActual<typeof import('../../lib/ui/context/breakpoints')>(
		'../../lib/ui/context/breakpoints'
	)
	return {
		...actual,
		useBreakpoint: () => (realBreakpoint.value ? actual.useBreakpoint() : 7),
	}
})

const commentingEnabled = vi.hoisted(() => ({ value: true }))
vi.mock('../../lib/ui/hooks/useCommentingEnabled', () => ({
	useCommentingEnabled: () => commentingEnabled.value,
}))

afterEach(() => {
	commentingEnabled.value = true
	realBreakpoint.value = false
	deleteFromLocalStorage('tldraw-command-palette-recents')
	deleteFromLocalStorage('minimap')
})

async function renderPalette({
	maxPages,
	onUiEvent,
	overrides,
	content = <DefaultCommandPaletteContent />,
	forceMobile,
}: {
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
	it('explains why align is unavailable with nothing selected', async () => {
		const { rendered, search } = await renderPalette()
		search('align left')
		const row = await rendered.findByTestId('command-palette.item.align-left')
		expect(row.getAttribute('aria-disabled')).toBe('true')
		await rendered.findByText('Select at least 2 shapes')
	})

	it('explains that frame commands need a frame, and enables them for one', async () => {
		const { editor, rendered, search } = await renderPalette()
		search('remove frame')
		const row = () => rendered.getByTestId('command-palette.item.remove-frame')
		await waitFor(() => expect(row().getAttribute('aria-disabled')).toBe('true'))
		await rendered.findByText('Select a frame first')
		act(() => {
			editor.createShapes([{ type: 'geo', x: 0, y: 0 }])
			editor.selectAll()
		})
		expect(row().getAttribute('aria-disabled')).toBe('true')
		act(() => {
			editor.selectNone()
			editor.createShapes([{ type: 'frame', x: 400, y: 0 }])
			editor.select(editor.getCurrentPageShapes().find((shape) => shape.type === 'frame')!)
		})
		await waitFor(() => expect(row().getAttribute('aria-disabled')).toBeNull())
	})

	it('explains kind-specific commands instead of hiding them', async () => {
		const { editor, rendered, search } = await renderPalette()
		const reasons = {
			ungroup: 'Select a group first',
			'toggle-auto-size': 'Select a text shape first',
			'download-original': 'Select an image or video first',
			'convert-to-embed': 'Select a bookmark first',
			'convert-to-bookmark': 'Select an embed first',
			'edit-link': 'Select one linkable shape first',
		}
		for (const [id, reason] of Object.entries(reasons)) {
			search(id.replace(/-/g, ' '))
			const row = await rendered.findByTestId(`command-palette.item.${id}`)
			expect(row.getAttribute('aria-disabled')).toBe('true')
			fireEvent.pointerMove(row)
			await rendered.findByText(reason)
		}
		act(() => {
			editor.createShapes([{ type: 'note', x: 0, y: 0 }])
			editor.selectAll()
		})
		search('flip horizontal')
		const flip = await rendered.findByTestId('command-palette.item.flip-horizontal')
		fireEvent.pointerMove(flip)
		await rendered.findByText("This shape can't be flipped")
	})

	it('aligns two selected shapes', async () => {
		const { editor, search, enter, rendered } = await renderPalette()
		const a = createShapeId()
		const b = createShapeId()
		act(() => {
			editor.createShapes([
				{ id: a, type: 'geo', x: 0, y: 0 },
				{ id: b, type: 'geo', x: 200, y: 300 },
			])
			editor.select(a, b)
		})
		search('align left')
		await waitFor(() =>
			expect(
				rendered.getByTestId('command-palette.item.align-left').getAttribute('aria-disabled')
			).toBeNull()
		)
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

	it('leaves out editing commands in readonly mode', async () => {
		const { editor, rendered, search } = await renderPalette()
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

	// The editor re-measures its container every second, and jsdom measures it as ~0 wide, which
	// drops the real breakpoint mid-test on a slow run.
	function pinViewport(editor: Editor, bounds: Box) {
		vi.spyOn(editor, 'updateViewportScreenBounds').mockRestore()
		act(() => editor.updateViewportScreenBounds(bounds))
		vi.spyOn(editor, 'updateViewportScreenBounds').mockImplementation(() => editor)
	}

	it('toggles the minimap, in step with the navigation panel', async () => {
		realBreakpoint.value = true
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

	it('hides toggle minimap when forceMobile hides the minimap', async () => {
		realBreakpoint.value = true
		const { editor, rendered, search } = await renderPalette({ forceMobile: true })
		pinViewport(editor, new Box(0, 0, 1400, 900))
		search('minimap')
		await rendered.findByTestId('command-palette.input')
		expect(rendered.queryByTestId('command-palette.item.toggle-minimap')).toBeNull()
	})

	it('hides toggle minimap in focus mode', async () => {
		realBreakpoint.value = true
		const { editor, rendered, search } = await renderPalette()
		pinViewport(editor, new Box(0, 0, 1400, 900))
		search('minimap')
		await rendered.findByTestId('command-palette.item.toggle-minimap')
		act(() => editor.updateInstanceState({ isFocusMode: true }))
		search('minimap')
		await rendered.findByTestId('command-palette.input')
		expect(rendered.queryByTestId('command-palette.item.toggle-minimap')).toBeNull()
	})

	it('renames, duplicates and deletes the current page', async () => {
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
		const del = await rendered.findByTestId('command-palette.item.delete-page')
		expect(del.getAttribute('aria-disabled')).toBe('true')

		search('duplicate page')
		enter()
		expect(editor.getPages()).toHaveLength(2)
		search('delete page')
		await waitFor(() =>
			expect(
				rendered.getByTestId('command-palette.item.delete-page').getAttribute('aria-disabled')
			).toBeNull()
		)
		enter()
		expect(editor.getPages()).toHaveLength(1)
	})

	it('translates prompt labels and placeholders, passing plain text through', async () => {
		const { rendered, input, search, enter } = await renderPalette({
			content: (
				<>
					<CommandPalettePagesGroup />
					<CommandPalettePromptItem
						id="rename-board"
						label="Rename board"
						placeholder="Board name"
						onSubmit={() => {}}
					/>
				</>
			),
		})
		search('rename page')
		const renamePage = await rendered.findByTestId('command-palette.item.rename-page')
		expect(renamePage.textContent).toBe('Rename page')
		enter()
		await waitFor(() => expect(input.placeholder).toBe('Page name'))
		fireEvent.keyDown(input, { key: 'Escape' })

		search('rename board')
		const renameBoard = await rendered.findByTestId('command-palette.item.rename-board')
		expect(renameBoard.textContent).toBe('Rename board')
		enter()
		await waitFor(() => expect(input.placeholder).toBe('Board name'))
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

	it("sets the selection's opacity, checking the current value", async () => {
		const { editor, rendered, search } = await renderPalette()
		act(() => {
			editor.createShapes([{ id: createShapeId('box'), type: 'geo', x: 0, y: 0 }])
			editor.select(createShapeId('box'))
		})
		search('opacity 50')
		fireEvent.click(await rendered.findByTestId('command-palette.item.style-opacity-0.5'))
		expect(editor.getShape(createShapeId('box'))!.opacity).toBe(0.5)
		await waitFor(() =>
			expect(
				rendered.getByTestId('command-palette.item.style-opacity-0.5').getAttribute('aria-checked')
			).toBe('true')
		)
	})

	it('opens in an editor without the geo shape', async () => {
		let editor!: Editor
		const rendered = render(
			<TldrawEditor
				shapeUtils={defaultShapeUtils.filter((util) => util.type !== 'geo')}
				tools={[...defaultTools, ...defaultShapeTools.filter((tool) => tool.id !== 'geo')]}
				initialState="select"
				onMount={(e) => {
					editor = e
				}}
			>
				<TldrawUi />
			</TldrawEditor>
		)
		await waitFor(() => expect(editor).toBeDefined())
		act(() => {
			editor.updateInstanceState({ isFocused: true })
			editor
				.getContainerDocument()
				.body.dispatchEvent(
					new KeyboardEvent('keydown', { bubbles: true, key: 'k', code: 'KeyK', metaKey: true })
				)
		})
		const input = await rendered.findByTestId('command-palette.input')
		fireEvent.change(input, { target: { value: 'color red' } })
		await rendered.findByTestId('command-palette.item.style-color-red')
	})

	it('opens on a shape with the geo style in an editor without the geo shape', async () => {
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
				shapeUtils={[GeoLikeShapeUtil]}
				tools={defaultTools}
				initialState="select"
				onMount={(e) => {
					editor = e
				}}
			>
				{/* The style panel's own geo picker needs the geo util too. */}
				<TldrawUi components={{ StylePanel: null }} />
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

		it('sets commandPalette and readonlyOk on every built-in action', async () => {
			let actions: TLUiActionsContextType = {}
			function Probe() {
				actions = useActions()
				return null
			}
			// Collaboration and the default palette slot add the conditional actions.
			const store = createTLStore({
				shapeUtils: defaultShapeUtils,
				bindingUtils: defaultBindingUtils,
				collaboration: { status: atom('status', 'online' as const) },
			})
			await renderTldrawComponentWithEditor(
				(onMount) => (
					<Tldraw store={store} onMount={onMount}>
						<Probe />
					</Tldraw>
				),
				{ waitForPatterns: false }
			)
			expect(actions['open-cursor-chat']).toBeDefined()
			expect(actions['open-command-palette']).toBeDefined()
			// Explicit, so a forgotten field can't drop an action into the catch-all or out of readonly.
			const missing = (field: 'commandPalette' | 'readonlyOk') =>
				Object.values(actions)
					.filter((action) => action[field] === undefined)
					.map((action) => action.id)
			expect({
				commandPalette: missing('commandPalette'),
				readonlyOk: missing('readonlyOk'),
			}).toEqual({
				commandPalette: [],
				readonlyOk: [],
			})
		})

		it('lists custom actions in the catch-all, minus opted-out ones', async () => {
			const { rendered, search } = await renderPalette({ overrides })
			await rendered.findByTestId('command-palette.item.make-blue')
			search('secret')
			expect(rendered.queryByTestId('command-palette.item.secret')).toBeNull()
		})

		it('gates custom actions, explained by the reason on their placed item', async () => {
			const { editor, rendered, search, enter } = await renderPalette({
				overrides,
				content: (
					<>
						<TldrawUiMenuGroup id="colors" label="Colors">
							<TldrawUiMenuActionItem
								actionId="make-red"
								disabledReason="command-palette.reason.select-shape"
							/>
						</TldrawUiMenuGroup>
						<DefaultCommandPaletteContent />
					</>
				),
			})
			search('make red')
			const row = await rendered.findByTestId('command-palette.item.make-red')
			expect(row.getAttribute('aria-disabled')).toBe('true')
			fireEvent.pointerMove(row)
			await rendered.findByText('Select a shape first')
			act(() => {
				editor.createShapes([{ type: 'geo', x: 0, y: 0 }])
				editor.selectAll()
			})
			await waitFor(() => expect(row.getAttribute('aria-disabled')).toBeNull())
			enter()
			expect(makeRed).toHaveBeenCalled()
		})

		it('leaves disabled actions without a reason out of search', async () => {
			const { editor, rendered, search } = await renderPalette({ overrides })
			act(() => editor.setCurrentTool('draw'))
			search('make red')
			await rendered.findByTestId('command-palette.input')
			await waitFor(() =>
				expect(rendered.queryByTestId('command-palette.item.make-red')).toBeNull()
			)
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

		it('asks for the select tool before the selection outside it', async () => {
			const { editor, rendered, search } = await renderPalette()
			act(() => {
				editor.createShapes([
					{ type: 'geo', x: 0, y: 0 },
					{ type: 'geo', x: 200, y: 0 },
				])
				editor.selectAll()
				editor.setCurrentTool('draw')
			})
			search('align left')
			const row = await rendered.findByTestId('command-palette.item.align-left')
			fireEvent.pointerMove(row)
			await rendered.findByText('Switch to the select tool first')
		})
	})
})
