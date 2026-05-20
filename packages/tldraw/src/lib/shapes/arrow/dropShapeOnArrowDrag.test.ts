import { TLArrowShape, TLTextShape, Vec, createShapeId } from '@tldraw/editor'
import { TestEditor } from '../../../test/TestEditor'
import { getArrowBindings, getArrowTerminalsInPageSpace } from './shared'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
}

beforeEach(() => {
	editor = new TestEditor()
	editor
		.selectAll()
		.deleteShapes(editor.getSelectedShapeIds())
		.createShapes([{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } }])
})

describe('dropBoundTextShapeAtArrowTerminal', () => {
	it('drops a text shape from the text shortcut while dragging an arrow terminal', () => {
		editor.setCurrentTool('arrow')
		editor.pointerDown(0, 0)
		editor.inputs.setPointerVelocity(new Vec(1, 1))
		editor.pointerMove(500, 500)
		editor.expectToBeIn('select.dragging_handle')

		const arrowId = editor.getCurrentPageShapes().find((s) => s.type === 'arrow')!
			.id as TLArrowShape['id']
		editor.pointerMove(600, 400)

		const arrow = editor.getShape<TLArrowShape>(arrowId)!
		const terminalBeforeDrop = getArrowTerminalsInPageSpace(editor, arrow).end

		editor.keyDown('t')
		editor.expectToBeIn('select.dragging_handle')
		expect(editor.getCurrentPageShapes().filter((s) => s.type === 'text')).toHaveLength(0)

		editor.keyUp('t')

		editor.expectToBeIn('select.editing_shape')

		const text = editor.getCurrentPageShapes().find((s) => s.type === 'text') as TLTextShape
		expect(text).toBeTruthy()
		expect(text.props.autoSize).toBe(true)
		expect(editor.getEditingShapeId()).toBe(text.id)
		expect(editor.getShapePageBounds(text)!.center).toCloselyMatchObject(terminalBeforeDrop)

		const bindings = getArrowBindings(editor, editor.getShape<TLArrowShape>(arrow.id)!)
		expect(bindings.start).toBeUndefined()
		expect(bindings.end).toMatchObject({
			toId: text.id,
			props: {
				terminal: 'end',
				normalizedAnchor: { x: 0.5, y: 0.5 },
			},
		})
	})
})
