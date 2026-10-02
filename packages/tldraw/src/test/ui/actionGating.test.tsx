import { act } from '@testing-library/react'
import { createShapeId, Editor } from '@tldraw/editor'
import { useEffect } from 'react'
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
