import { Editor, TLShapeId, createShapeId } from '@tldraw/editor'
import { useEffect } from 'react'
import { Tldraw } from '../../lib/Tldraw'
import { TLUiActionsContextType, useActions } from '../../lib/ui/context/actions'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

// Actions that treat a shape as an object (move, transform, restructure, remove, relocate)
// should end the text-editing interaction before they run.
const ACTIONS_THAT_END_EDITING = [
	// lifecycle / structure
	'duplicate',
	'delete',
	'cut',
	'group',
	'ungroup',
	'frame-selection',
	'remove-frame',
	'fit-frame-to-content',
	'flatten-to-image',
	'move-to-new-page',
	// transform
	'rotate-cw',
	'rotate-ccw',
	'flip-horizontal',
	'flip-vertical',
	'stretch-horizontal',
	'stretch-vertical',
	'pack',
	'enlarge-shapes',
	'shrink-shapes',
	// arrange
	'align-left',
	'align-center-horizontal',
	'align-right',
	'align-center-vertical',
	'align-top',
	'align-bottom',
	'distribute-horizontal',
	'distribute-vertical',
	'stack-vertical',
	'stack-horizontal',
	'bring-to-front',
	'bring-forward',
	'send-backward',
	'send-to-back',
	// other
	'toggle-lock',
	'edit-link',
] as const

// Actions that change the shape's content/appearance or are view-only should NOT end editing,
// so you can (for example) recolor or zoom while still editing text.
const ACTIONS_THAT_KEEP_EDITING = [
	'toggle-auto-size',
	'select-white-color',
	'zoom-to-selection',
	'copy',
] as const

function ActionsCapturer({ onCapture }: { onCapture(actions: TLUiActionsContextType): void }) {
	const actions = useActions()
	useEffect(() => {
		onCapture(actions)
	}, [actions, onCapture])
	return null
}

let editor: Editor
let actions: TLUiActionsContextType

// Render a fresh editor for each test. Editing state is reactive tool-state, and reusing one
// editor across cases let a leaked `editing_shape` state make guards pass for the wrong reason.
beforeEach(async () => {
	let captured: TLUiActionsContextType | null = null
	const result = await renderTldrawComponentWithEditor(
		(onMount) => (
			<Tldraw onMount={onMount}>
				<ActionsCapturer onCapture={(a) => (captured = a)} />
			</Tldraw>
		),
		{ waitForPatterns: false }
	)
	editor = result.editor
	actions = captured!
})

function startEditingGeoShape(): TLShapeId {
	const id = createShapeId()
	editor.createShape({ id, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
	editor.setEditingShape(id)
	return id
}

function runAction(id: string) {
	try {
		// Some actions have side effects (clipboard, rasterizing to an image) that don't fully
		// work under jsdom. We only assert whether editing was exited, which happens up front.
		const result = actions[id].onSelect('unknown')
		if (result && typeof (result as Promise<void>).then === 'function') {
			;(result as Promise<void>).catch(() => {})
		}
	} catch {
		// ignore action side-effect errors; we only care about the editing state
	}
}

describe('completeEditing on actions', () => {
	it('starts in the editing state for the test fixture', () => {
		const id = startEditingGeoShape()
		expect(editor.getEditingShapeId()).toBe(id)
		expect(editor.isIn('select.editing_shape')).toBe(true)
	})

	it('exits editing when duplicating while editing', () => {
		const id = startEditingGeoShape()
		expect(editor.getEditingShapeId()).toBe(id)

		runAction('duplicate')

		expect(editor.getEditingShapeId()).toBe(null)
		expect(editor.isIn('select.editing_shape')).toBe(false)
	})

	describe('actions that should end editing', () => {
		it.each(ACTIONS_THAT_END_EDITING)('%s ends editing', (id) => {
			startEditingGeoShape()
			expect(editor.getEditingShapeId()).not.toBe(null)

			runAction(id)

			expect(editor.getEditingShapeId()).toBe(null)
			expect(editor.isIn('select.editing_shape')).toBe(false)
		})
	})

	describe('actions that should keep editing', () => {
		it.each(ACTIONS_THAT_KEEP_EDITING)('%s keeps editing', (id) => {
			const editingId = startEditingGeoShape()
			expect(editor.getEditingShapeId()).toBe(editingId)
			expect(editor.isIn('select.editing_shape')).toBe(true)

			runAction(id)

			expect(editor.getEditingShapeId()).toBe(editingId)
			expect(editor.isIn('select.editing_shape')).toBe(true)
		})
	})

	it('does not crash on undo after duplicating while editing', () => {
		const id = startEditingGeoShape()
		editor.markHistoryStoppingPoint('duplicate')
		runAction('duplicate')
		expect(editor.getEditingShapeId()).toBe(null)

		expect(() => editor.undo()).not.toThrow()
		expect(editor.getShape(id)).not.toBe(undefined)
	})
})
