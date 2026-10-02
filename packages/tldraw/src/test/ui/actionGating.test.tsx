import { act } from '@testing-library/react'
import { createShapeId, Editor, TLShapeId } from '@tldraw/editor'
import { useEffect } from 'react'
import { vi } from 'vitest'
import { Tldraw } from '../../lib/Tldraw'
import { TLUiActionsContextType, useActions } from '../../lib/ui/context/actions'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

function ActionCapturer({ onCapture }: { onCapture(actions: TLUiActionsContextType): void }) {
	const actions = useActions()
	useEffect(() => onCapture(actions), [actions, onCapture])
	return null
}

async function setup() {
	const captured: TLUiActionsContextType[] = []
	const { editor } = await renderTldrawComponentWithEditor(
		(onMount) => (
			<Tldraw onMount={onMount}>
				<ActionCapturer
					onCapture={(a) => {
						captured.push(a)
					}}
				/>
			</Tldraw>
		),
		{ waitForPatterns: false }
	)
	return { editor, captured, actions: () => captured[captured.length - 1] }
}

const a = createShapeId('a')
const b = createShapeId('b')
const c = createShapeId('c')

function seed(editor: Editor) {
	act(() => {
		editor.createShapes([
			{ id: a, type: 'geo', x: 0, y: 0 },
			{ id: b, type: 'geo', x: 200, y: 0 },
			{ id: c, type: 'geo', x: 400, y: 0 },
		])
	})
}

function enabledMap(editor: Editor, actions: TLUiActionsContextType, actionIds: string[]) {
	return Object.fromEntries(
		actionIds.map((id) => [id, actions[id].isEnabled ? actions[id].isEnabled!(editor) : true])
	)
}

describe('built-in action isEnabled', () => {
	it('selection actions need the select tool and unlocked shapes', async () => {
		const { editor, actions } = await setup()
		seed(editor)
		const ids = [
			'delete',
			'cut',
			'duplicate',
			'bring-to-front',
			'rotate-cw',
			'align-left',
			'distribute-horizontal',
			'group',
			'toggle-lock',
			'copy',
		]
		act(() => editor.select(a, b))
		expect(enabledMap(editor, actions(), ids)).toEqual({
			delete: true,
			cut: true,
			duplicate: true,
			'bring-to-front': true,
			'rotate-cw': true,
			'align-left': true,
			'distribute-horizontal': false,
			group: true,
			'toggle-lock': true,
			copy: true,
		})
		act(() => editor.setCurrentTool('hand'))
		expect(enabledMap(editor, actions(), ids)).toEqual({
			delete: false,
			cut: false,
			duplicate: false,
			'bring-to-front': false,
			'rotate-cw': false,
			'align-left': false,
			'distribute-horizontal': false,
			group: false,
			'toggle-lock': false,
			copy: false,
		})
		act(() => {
			editor.setCurrentTool('select')
			editor.updateShapes([{ id: a, type: 'geo', isLocked: true }])
			editor.select(a, b)
		})
		expect(enabledMap(editor, actions(), ids)).toEqual({
			delete: true,
			cut: true,
			duplicate: true,
			'bring-to-front': true,
			'rotate-cw': true,
			'align-left': false,
			'distribute-horizontal': false,
			group: false,
			'toggle-lock': true,
			copy: true,
		})
	})

	describe('select-tool gating', () => {
		const geo = (id: TLShapeId, x = 0) => ({ id, type: 'geo', x, y: 0 }) as const
		const [g1, g2, g3] = [a, b, c]
		const setups: Record<string, (editor: Editor) => void> = {
			ungroup(editor) {
				editor.createShapes([geo(g1), geo(g2, 200)])
				editor.groupShapes([g1, g2], { groupId: createShapeId('grp') })
				editor.select(createShapeId('grp'))
			},
			'edit-link'(editor) {
				editor.createShapes([geo(g1)])
				editor.select(g1)
			},
			'toggle-auto-size'(editor) {
				editor.createShape({ id: g1, type: 'text', props: { autoSize: false } })
				editor.select(g1)
			},
			'frame-selection'(editor) {
				editor.createShapes([geo(g1)])
				editor.select(g1)
			},
			'remove-frame'(editor) {
				editor.createShape({ id: g1, type: 'frame' })
				editor.select(g1)
			},
			'fit-frame-to-content'(editor) {
				editor.createShape({ id: g1, type: 'frame' })
				editor.createShape({ ...geo(g2), parentId: g1 })
				editor.select(g1)
			},
			'convert-to-bookmark'(editor) {
				editor.createShape({
					id: g1,
					type: 'embed',
					props: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
				})
				editor.select(g1)
			},
			'convert-to-embed'(editor) {
				editor.createShape({
					id: g1,
					type: 'bookmark',
					props: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
				})
				editor.select(g1)
			},
			'flip-horizontal'(editor) {
				editor.createShapes([geo(g1), geo(g2, 200)])
				editor.select(g1, g2)
			},
			'flip-vertical'(editor) {
				editor.createShapes([geo(g1), geo(g2, 200)])
				editor.select(g1, g2)
			},
			'stack-horizontal'(editor) {
				editor.createShapes([geo(g1), geo(g2, 200), geo(g3, 400)])
				editor.select(g1, g2, g3)
			},
			'stack-vertical'(editor) {
				editor.createShapes([geo(g1), geo(g2, 200), geo(g3, 400)])
				editor.select(g1, g2, g3)
			},
			pack(editor) {
				editor.createShapes([geo(g1), geo(g2, 200)])
				editor.select(g1, g2)
			},
			'bring-to-front': oneGeo,
			'bring-forward': oneGeo,
			'send-backward': oneGeo,
			'send-to-back': oneGeo,
		}
		function oneGeo(editor: Editor) {
			editor.createShapes([geo(g1)])
			editor.select(g1)
		}

		it.each(Object.keys(setups))(
			'%s is enabled in select and disabled in another tool',
			async (id) => {
				const { editor, actions } = await setup()
				act(() => setups[id](editor))
				expect(actions()[id].isEnabled!(editor)).toBe(true)
				act(() => editor.setCurrentTool('hand'))
				expect(editor.getSelectedShapeIds().length).toBeGreaterThan(0)
				expect(actions()[id].isEnabled!(editor)).toBe(false)
			}
		)

		it('flip is off for a single locked shape', async () => {
			const { editor, actions } = await setup()
			act(() => {
				editor.createShapes([{ ...geo(g1), isLocked: true }])
				editor.select(g1)
			})
			expect(actions()['flip-horizontal'].isEnabled!(editor)).toBe(false)
		})

		describe.each([
			['flip-horizontal', 'x'],
			['flip-vertical', 'y'],
		] as const)('%s shortcut', (actionId, axis) => {
			it('flips a lone shape that can flip', async () => {
				const { editor, actions } = await setup()
				act(() => {
					editor.createShape(geo(g1))
					editor.select(g1)
				})
				const flipShapes = vi.spyOn(editor, 'flipShapes')
				act(() => actions()[actionId].onSelect('kbd'))
				expect(flipShapes).toHaveBeenCalledTimes(1)
			})

			it('ignores a lone shape that cannot flip', async () => {
				const { editor, actions } = await setup()
				act(() => {
					editor.createShape({ id: g1, type: 'text', x: 0, y: 0 })
					editor.select(g1)
				})
				expect(actions()[actionId].isEnabled!(editor)).toBe(false)
				const flipShapes = vi.spyOn(editor, 'flipShapes')
				act(() => actions()[actionId].onSelect('kbd'))
				expect(flipShapes).not.toHaveBeenCalled()
			})

			it('still moves shapes that cannot flip in a mixed selection', async () => {
				const { editor, actions } = await setup()
				act(() => {
					editor.createShapes([geo(g1), { id: g2, type: 'text', x: 200, y: 200 }])
					editor.select(g1, g2)
				})
				act(() => actions()[actionId].onSelect('kbd'))
				expect(editor.getShape(g1)![axis]).toBeGreaterThan(0)
				expect(editor.getShape(g2)![axis]).toBeLessThan(200)
			})
		})
	})

	it('select-all needs shapes but not the select tool', async () => {
		const { editor, actions } = await setup()
		expect(actions()['select-all'].isEnabled!(editor)).toBe(false)
		seed(editor)
		act(() => editor.setCurrentTool('hand'))
		expect(actions()['select-all'].isEnabled!(editor)).toBe(true)
	})

	it('page-level actions', async () => {
		const { editor, actions } = await setup()
		const ids = ['unlock-all', 'export-all-as-svg', 'zoom-to-fit', 'print']
		expect(enabledMap(editor, actions(), ids)).toEqual({
			'unlock-all': false,
			'export-all-as-svg': false,
			'zoom-to-fit': false,
			print: false,
		})
		seed(editor)
		act(() => editor.updateShapes([{ id: c, type: 'geo', isLocked: true }]))
		expect(enabledMap(editor, actions(), ids)).toEqual({
			'unlock-all': true,
			'export-all-as-svg': true,
			'zoom-to-fit': true,
			print: true,
		})
	})

	it('move-to-new-page stops at max pages', async () => {
		const { editor, actions } = await setup()
		seed(editor)
		act(() => editor.select(a))
		expect(actions()['move-to-new-page'].isEnabled!(editor)).toBe(true)
		act(() => {
			for (let i = editor.getPages().length; i < editor.options.maxPages; i++) {
				editor.createPage({ name: `p${i}` })
			}
		})
		expect(actions()['move-to-new-page'].isEnabled!(editor)).toBe(false)
	})
})

describe('built-in action isAvailable', () => {
	it('splits availability from enablement', async () => {
		const { editor, actions } = await setup()
		const state = (id: string) => ({
			available: actions()[id].isAvailable!(editor),
			enabled: actions()[id].isEnabled!(editor),
		})
		expect(state('copy-as-json')).toEqual({ available: false, enabled: false })
		act(() => editor.updateInstanceState({ isDebugMode: true }))
		expect(state('copy-as-json')).toEqual({ available: true, enabled: false })
		seed(editor)
		expect(state('copy-as-json')).toEqual({ available: true, enabled: true })
		expect(actions()['exit-pen-mode'].isAvailable!(editor)).toBe(false)
		act(() => editor.updateInstanceState({ isPenMode: true }))
		expect(actions()['exit-pen-mode'].isAvailable!(editor)).toBe(true)
	})
})

describe('built-in action isChecked', () => {
	it('reads user and instance state', async () => {
		const { editor, actions } = await setup()
		const checked = (id: string) => actions()[id].isChecked!(editor)
		expect(checked('toggle-grid')).toBe(false)
		act(() => editor.updateInstanceState({ isGridMode: true }))
		expect(checked('toggle-grid')).toBe(true)
		expect(checked('toggle-transparent')).toBe(!editor.getInstanceState().exportBackground)
		act(() => editor.user.updateUserPreferences({ edgeScrollSpeed: 2 }))
		expect(checked('toggle-edge-scrolling')).toBe(true)
		act(() => editor.user.updateUserPreferences({ edgeScrollSpeed: 0 }))
		expect(checked('toggle-edge-scrolling')).toBe(false)
	})

	it('every checkbox action has isChecked', async () => {
		const { actions } = await setup()
		const missing = Object.values(actions())
			.filter((action) => action.checkbox && !action.isChecked)
			.map((action) => action.id)
		expect(missing).toEqual([])
	})
})

describe('purity and stability', () => {
	it('evaluating every isEnabled and isChecked changes nothing', async () => {
		const { editor, actions } = await setup()
		seed(editor)
		act(() => {
			editor.select(a, b)
			editor.setCurrentTool('hand')
		})
		const before = { tool: editor.getCurrentToolId(), records: editor.store.serialize('all') }
		for (const action of Object.values(actions())) {
			action.isAvailable?.(editor)
			action.isEnabled?.(editor)
			action.isChecked?.(editor)
		}
		expect({ tool: editor.getCurrentToolId(), records: editor.store.serialize('all') }).toEqual(
			before
		)
	})

	it('selection changes do not rebuild the actions object', async () => {
		const { editor, captured } = await setup()
		seed(editor)
		const count = captured.length
		act(() => editor.select(a))
		act(() => editor.select(a, b))
		act(() => editor.selectNone())
		expect(captured.length).toBe(count)
	})
})
