import { TLArrowShape, createShapeId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	box3: createShapeId('box3'),
	box4: createShapeId('box4'),
	box5: createShapeId('box5'),
	frame1: createShapeId('frame1'),
	group1: createShapeId('group1'),
	group2: createShapeId('group2'),
	group3: createShapeId('group3'),
	arrow1: createShapeId('arrow1'),
	arrow2: createShapeId('arrow2'),
	arrow3: createShapeId('arrow3'),
}

beforeEach(() => {
	editor = new TestEditor()
})

function arrow() {
	return editor.shapesOnCurrentPage.find((s) => s.type === 'arrow') as TLArrowShape
}

describe('restoring bound arrows', () => {
	beforeEach(() => {
		editor.createShapes([
			{ id: ids.box1, type: 'geo', x: 0, y: 0 },
			{ id: ids.box2, type: 'geo', x: 200, y: 0 },
		])
		// create arrow from box1 to box2
		editor
			.setCurrentTool('arrow')
			.pointerMove(50, 50)
			.pointerDown()
			.pointerMove(250, 50)
			.pointerUp()
	})
	it('removes bound arrows on delete, restores them on undo but only when change was done by user', () => {
		editor.mark('deleting')
		editor.deleteShapes([ids.box2])
		expect(arrow().props.end.type).toBe('point')
		editor.undo()
		expect(arrow().props.end.type).toBe('binding')
		editor.redo()
		expect(arrow().props.end.type).toBe('point')
	})

	it('removes / restores multiple bindings', () => {
		editor.mark('deleting')
		expect(arrow().props.start.type).toBe('binding')
		expect(arrow().props.end.type).toBe('binding')

		editor.deleteShapes([ids.box1, ids.box2])
		expect(arrow().props.start.type).toBe('point')
		expect(arrow().props.end.type).toBe('point')

		editor.undo()
		expect(arrow().props.start.type).toBe('binding')
		expect(arrow().props.end.type).toBe('binding')

		editor.redo()
		expect(arrow().props.start.type).toBe('point')
		expect(arrow().props.end.type).toBe('point')
	})
})
