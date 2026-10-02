import { act, fireEvent, waitFor } from '@testing-library/react'
import { createShapeId, deleteFromLocalStorage } from '@tldraw/editor'
import { ReactNode } from 'react'
import { vi } from 'vitest'
import { Tldraw } from '../../lib/Tldraw'
import { CommandPaletteActionGroup } from '../../lib/ui/components/CommandPalette/CommandPaletteGroups'
import { CommandPaletteToolsGroup } from '../../lib/ui/components/CommandPalette/CommandPaletteGroups'
import { CommandPaletteShell } from '../../lib/ui/components/CommandPalette/CommandPaletteShell'
import { DefaultCommandPaletteContent } from '../../lib/ui/components/CommandPalette/DefaultCommandPaletteContent'
import { TLUiActionsContextType, useActions } from '../../lib/ui/context/actions'
import { getCommandPaletteSuggestions } from '../../lib/ui/context/command-palette-defaults'
import { TLUiOverrides } from '../../lib/ui/overrides'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

vi.mock('../../lib/ui/hooks/useTranslation/useTranslation', async () =>
	vi.importActual('../../lib/ui/hooks/useTranslation/useTranslation')
)

afterEach(() => deleteFromLocalStorage('tldraw-command-palette-recents'))

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

	it('suggests the commands for what is selected, most specific first', async () => {
		const { editor } = await renderPalette()
		expect(getCommandPaletteSuggestions(editor)).toEqual([
			'insert-media',
			'zoom-to-fit',
			'select-all',
		])
		act(() => {
			editor.createShapes([
				{ type: 'geo', x: 0, y: 0 },
				{ type: 'geo', x: 200, y: 0 },
			])
			editor.selectAll()
		})
		expect(getCommandPaletteSuggestions(editor)).toEqual([
			'group',
			'align-center-horizontal',
			'align-center-vertical',
			'duplicate',
			'frame-selection',
			'toggle-lock',
			'delete',
		])
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
		expect(rendered.getByTestId('command-palette.back').textContent).toBe('Language')
		expect((await rendered.findByTestId('command-palette.item.language-de')).textContent).toBe(
			'Deutsch'
		)
	})

	it('leaves tools out of the default content but keeps insert media', async () => {
		const { rendered, search } = await renderPalette()
		await rendered.findByTestId('command-palette.item.insert-media')
		expect(rendered.queryByTestId('command-palette.item.rectangle')).toBeNull()
		search('rectangle')
		expect(rendered.queryByTestId('command-palette.item.rectangle')).toBeNull()
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

	describe('actions', () => {
		const makeRed = vi.fn()
		const overrides: TLUiOverrides = {
			actions(_editor, actions) {
				actions['make-red'] = {
					id: 'make-red',
					label: 'Make red',
					isEnabled: (editor) => editor.getSelectedShapeIds().length > 0,
					disabledReason: (editor) =>
						editor.isIn('select') ? 'command-palette.reason.select-shape' : undefined,
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

		it("gates custom actions and explains them with the action's reason", async () => {
			const { editor, rendered, search, enter } = await renderPalette({ overrides })
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
