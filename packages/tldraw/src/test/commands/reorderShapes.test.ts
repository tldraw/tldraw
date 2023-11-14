import { TLShapeId, createShapeId } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

function expectShapesInOrder(editor: TestEditor, ...ids: TLShapeId[]) {
	expect(editor.getCurrentPageShapesSorted().map((shape) => shape.id)).toMatchObject(ids)
}

function getSiblingBelow(editor: TestEditor, id: TLShapeId) {
	const shape = editor.getShape(id)!
	const siblings = editor.getSortedChildIdsForParent(shape.parentId)
	const index = siblings.indexOf(id)
	return siblings[index - 1]
}

function getSiblingAbove(editor: TestEditor, id: TLShapeId) {
	const shape = editor.getShape(id)!
	const siblings = editor.getSortedChildIdsForParent(shape.parentId)
	const index = siblings.indexOf(id)
	return siblings[index + 1]
}

const ids = {
	A: createShapeId('A'),
	B: createShapeId('B'),
	C: createShapeId('C'),
	D: createShapeId('D'),
	E: createShapeId('E'),
	F: createShapeId('F'),
	G: createShapeId('G'),
}

beforeEach(() => {
	editor?.dispose()
	editor = new TestEditor()
	editor.createShapes([
		{
			id: ids['A'],
			type: 'geo',
		},
		{
			id: ids['B'],
			type: 'geo',
		},
		{
			id: ids['C'],
			type: 'geo',
		},
		{
			id: ids['D'],
			type: 'geo',
		},
		{
			id: ids['E'],
			type: 'geo',
		},
		{
			id: ids['F'],
			type: 'geo',
		},
		{
			id: ids['G'],
			type: 'geo',
		},
	])
})

describe('When running zindex tests', () => {
	it('Correctly initializes indices', () => {
		expect(editor.getCurrentPageShapesSorted().map((shape) => shape.index)).toMatchObject([
			'a1',
			'a2',
			'a3',
			'a4',
			'a5',
			'a6',
			'a7',
		])
	})

	it('Correctly identifies shape orders', () => {
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['C'],
			ids['D'],
			ids['E'],
			ids['F'],
			ids['G']
		)
	})
})

describe('editor.getSiblingAbove', () => {
	it('Gets the correct shape above', () => {
		expect(getSiblingAbove(editor, ids['B'])).toBe(ids['C'])
		expect(getSiblingAbove(editor, ids['C'])).toBe(ids['D'])
		expect(getSiblingAbove(editor, ids['G'])).toBeUndefined()
	})
})

describe('editor.getSiblingAbove', () => {
	it('Gets the correct shape above', () => {
		expect(getSiblingBelow(editor, ids['A'])).toBeUndefined()
		expect(getSiblingBelow(editor, ids['B'])).toBe(ids['A'])
		expect(getSiblingBelow(editor, ids['C'])).toBe(ids['B'])
	})
})

describe('When sending to back', () => {
	it('Moves one shape to back', () => {
		editor.sendToBack([ids['D']])
		expectShapesInOrder(
			editor,
			ids['D'],
			ids['A'],
			ids['B'],
			ids['C'],
			ids['E'],
			ids['F'],
			ids['G']
		)
		editor.sendToBack([ids['D']]) // noop
		expectShapesInOrder(
			editor,
			ids['D'],
			ids['A'],
			ids['B'],
			ids['C'],
			ids['E'],
			ids['F'],
			ids['G']
		)
	})

	it('Moves no shapes when selecting shapes at the back', () => {
		editor.sendToBack([ids['A'], ids['B'], ids['C']])
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['C'],
			ids['D'],
			ids['E'],
			ids['F'],
			ids['G']
		)
		editor.sendToBack([ids['A'], ids['B'], ids['C']])
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['C'],
			ids['D'],
			ids['E'],
			ids['F'],
			ids['G']
		)
	})

	it('Moves two adjacent shapes to back', () => {
		editor.sendToBack([ids['D'], ids['E']])
		expectShapesInOrder(
			editor,
			ids['D'],
			ids['E'],
			ids['A'],
			ids['B'],
			ids['C'],
			ids['F'],
			ids['G']
		)
		editor.sendToBack([ids['D'], ids['E']])
		expectShapesInOrder(
			editor,
			ids['D'],
			ids['E'],
			ids['A'],
			ids['B'],
			ids['C'],
			ids['F'],
			ids['G']
		)
	})

	it('Moves non-adjacent shapes to back', () => {
		editor.sendToBack([ids['E'], ids['G']])
		expectShapesInOrder(
			editor,
			ids['E'],
			ids['G'],
			ids['A'],
			ids['B'],
			ids['C'],
			ids['D'],
			ids['F']
		)
		editor.sendToBack([ids['E'], ids['G']])
		expectShapesInOrder(
			editor,
			ids['E'],
			ids['G'],
			ids['A'],
			ids['B'],
			ids['C'],
			ids['D'],
			ids['F']
		)
	})

	it('Moves non-adjacent shapes to back when one is at the back', () => {
		editor.sendToBack([ids['A'], ids['G']])
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['G'],
			ids['B'],
			ids['C'],
			ids['D'],
			ids['E'],
			ids['F']
		)
		editor.sendToBack([ids['A'], ids['G']])
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['G'],
			ids['B'],
			ids['C'],
			ids['D'],
			ids['E'],
			ids['F']
		)
	})
})

describe('When sending to front', () => {
	it('Moves one shape to front', () => {
		editor.bringToFront([ids['A']])
		expectShapesInOrder(
			editor,
			ids['B'],
			ids['C'],
			ids['D'],
			ids['E'],
			ids['F'],
			ids['G'],
			ids['A']
		)
		editor.bringToFront([ids['A']]) // noop
		expectShapesInOrder(
			editor,
			ids['B'],
			ids['C'],
			ids['D'],
			ids['E'],
			ids['F'],
			ids['G'],
			ids['A']
		)
	})

	it('Moves no shapes when selecting shapes at the front', () => {
		editor.bringToFront([ids['G']])
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['C'],
			ids['D'],
			ids['E'],
			ids['F'],
			ids['G']
		)
		editor.bringToFront([ids['G']]) // noop
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['C'],
			ids['D'],
			ids['E'],
			ids['F'],
			ids['G']
		)
	})

	it('Moves two adjacent shapes to front', () => {
		editor.bringToFront([ids['D'], ids['E']])
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['C'],
			ids['F'],
			ids['G'],
			ids['D'],
			ids['E']
		)
		editor.bringToFront([ids['D'], ids['E']]) // noop
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['C'],
			ids['F'],
			ids['G'],
			ids['D'],
			ids['E']
		)
	})

	it('Moves non-adjacent shapes to front', () => {
		editor.bringToFront([ids['A'], ids['C']])
		expectShapesInOrder(
			editor,
			ids['B'],
			ids['D'],
			ids['E'],
			ids['F'],
			ids['G'],
			ids['A'],
			ids['C']
		)
		editor.bringToFront([ids['A'], ids['C']]) // noop
		expectShapesInOrder(
			editor,
			ids['B'],
			ids['D'],
			ids['E'],
			ids['F'],
			ids['G'],
			ids['A'],
			ids['C']
		)
	})

	it('Moves non-adjacent shapes to front when one is at the front', () => {
		editor.bringToFront([ids['E'], ids['G']])
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['C'],
			ids['D'],
			ids['F'],
			ids['E'],
			ids['G']
		)
		editor.bringToFront([ids['E'], ids['G']])
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['C'],
			ids['D'],
			ids['F'],
			ids['E'],
			ids['G']
		)
	})
})

describe('When sending backward', () => {
	it('Moves one shape backward', () => {
		editor.sendBackward([ids['C']])
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['C'],
			ids['B'],
			ids['D'],
			ids['E'],
			ids['F'],
			ids['G']
		)
		editor.sendBackward([ids['C']])
		expectShapesInOrder(
			editor,
			ids['C'],
			ids['A'],
			ids['B'],
			ids['D'],
			ids['E'],
			ids['F'],
			ids['G']
		)
	})

	it('Moves shapes to the first position', () => {
		editor.sendBackward([ids['B']])
		expectShapesInOrder(
			editor,
			ids['B'],
			ids['A'],
			ids['C'],
			ids['D'],
			ids['E'],
			ids['F'],
			ids['G']
		)
		editor.sendBackward([ids['A']])
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['C'],
			ids['D'],
			ids['E'],
			ids['F'],
			ids['G']
		)
		editor.sendBackward([ids['B']])
		expectShapesInOrder(
			editor,
			ids['B'],
			ids['A'],
			ids['C'],
			ids['D'],
			ids['E'],
			ids['F'],
			ids['G']
		)
	})

	it('Moves two shapes to the first position', () => {
		editor.sendBackward([ids['B'], ids['C']])
		expectShapesInOrder(
			editor,
			ids['B'],
			ids['C'],
			ids['A'],
			ids['D'],
			ids['E'],
			ids['F'],
			ids['G']
		)
		editor.sendBackward([ids['C'], ids['A']])
		expectShapesInOrder(
			editor,
			ids['C'],
			ids['A'],
			ids['B'],
			ids['D'],
			ids['E'],
			ids['F'],
			ids['G']
		)
		editor.sendBackward([ids['A'], ids['B']])
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['C'],
			ids['D'],
			ids['E'],
			ids['F'],
			ids['G']
		)
	})

	it('Moves no shapes when sending shapes at the back', () => {
		editor.sendBackward([ids['A'], ids['B'], ids['C']])
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['C'],
			ids['D'],
			ids['E'],
			ids['F'],
			ids['G']
		)
		editor.sendBackward([ids['A'], ids['B'], ids['C']])
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['C'],
			ids['D'],
			ids['E'],
			ids['F'],
			ids['G']
		)
	})

	it('Moves two adjacent shapes backward', () => {
		editor.sendBackward([ids['D'], ids['E']])
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['D'],
			ids['E'],
			ids['C'],
			ids['F'],
			ids['G']
		)
	})

	it('Moves two adjacent shapes backward when one is at the back', () => {
		editor.sendBackward([ids['A'], ids['E']])
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['C'],
			ids['E'],
			ids['D'],
			ids['F'],
			ids['G']
		)
		editor.sendBackward([ids['A'], ids['E']])
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['E'],
			ids['C'],
			ids['D'],
			ids['F'],
			ids['G']
		)
	})

	it('Moves non-adjacent shapes backward', () => {
		editor.sendBackward([ids['E'], ids['G']])
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['C'],
			ids['E'],
			ids['D'],
			ids['G'],
			ids['F']
		)
		editor.sendBackward([ids['E'], ids['G']])
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['E'],
			ids['C'],
			ids['G'],
			ids['D'],
			ids['F']
		)
	})

	it('Moves non-adjacent shapes backward when one is at the back', () => {
		editor.sendBackward([ids['A'], ids['G']])
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['C'],
			ids['D'],
			ids['E'],
			ids['G'],
			ids['F']
		)
		editor.sendBackward([ids['A'], ids['G']])
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['C'],
			ids['D'],
			ids['G'],
			ids['E'],
			ids['F']
		)
	})

	it('Moves non-adjacent shapes to backward when both are at the back', () => {
		editor.sendBackward([ids['A'], ids['B']])
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['C'],
			ids['D'],
			ids['E'],
			ids['F'],
			ids['G']
		)
		editor.sendBackward([ids['A'], ids['B']])
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['C'],
			ids['D'],
			ids['E'],
			ids['F'],
			ids['G']
		)
	})
})

describe('When moving forward', () => {
	it('Moves one shape forward', () => {
		editor.bringForward([ids['A']])
		expectShapesInOrder(
			editor,
			ids['B'],
			ids['A'],
			ids['C'],
			ids['D'],
			ids['E'],
			ids['F'],
			ids['G']
		)
		editor.bringForward([ids['A']])
		expectShapesInOrder(
			editor,
			ids['B'],
			ids['C'],
			ids['A'],
			ids['D'],
			ids['E'],
			ids['F'],
			ids['G']
		)
	})

	it('Moves no shapes when sending shapes at the front', () => {
		editor.bringForward([ids['E'], ids['F'], ids['G']])
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['C'],
			ids['D'],
			ids['E'],
			ids['F'],
			ids['G']
		)
		editor.bringForward([ids['E'], ids['F'], ids['G']]) // noop
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['C'],
			ids['D'],
			ids['E'],
			ids['F'],
			ids['G']
		)
	})

	it('Moves two adjacent shapes forward', () => {
		editor.bringForward([ids['C'], ids['D']])
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['E'],
			ids['C'],
			ids['D'],
			ids['F'],
			ids['G']
		)
		editor.bringForward([ids['C'], ids['D']])
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['E'],
			ids['F'],
			ids['C'],
			ids['D'],
			ids['G']
		)
	})

	it('Moves non-adjacent shapes forward', () => {
		editor.bringForward([ids['A'], ids['C']])
		expectShapesInOrder(
			editor,
			ids['B'],
			ids['A'],
			ids['D'],
			ids['C'],
			ids['E'],
			ids['F'],
			ids['G']
		)
		editor.bringForward([ids['A'], ids['C']])
		expectShapesInOrder(
			editor,
			ids['B'],
			ids['D'],
			ids['A'],
			ids['E'],
			ids['C'],
			ids['F'],
			ids['G']
		)
	})

	it('Moves non-adjacent shapes to forward when one is at the front', () => {
		editor.bringForward([ids['C'], ids['G']])
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['D'],
			ids['C'],
			ids['E'],
			ids['F'],
			ids['G']
		)
		editor.bringForward([ids['C'], ids['G']])
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['D'],
			ids['E'],
			ids['C'],
			ids['F'],
			ids['G']
		)
	})

	it('Moves adjacent shapes to forward when both are at the front', () => {
		editor.bringForward([ids['F'], ids['G']])
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['C'],
			ids['D'],
			ids['E'],
			ids['F'],
			ids['G']
		)
		editor.bringForward([ids['F'], ids['G']])
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['C'],
			ids['D'],
			ids['E'],
			ids['F'],
			ids['G']
		)
	})
})

// Edges

describe('Edge cases...', () => {
	it('When bringing forward, does not increment order if shapes at at the top', () => {
		editor.bringForward([ids['F'], ids['G']])
	})
	it('When bringing forward, does not increment order with non-adjacent shapes if shapes at at the top', () => {
		editor.bringForward([ids['E'], ids['G']])
	})

	it('When bringing to front, does not change order of shapes already at top', () => {
		editor.bringToFront([ids['E'], ids['G']])
	})

	it('When sending to back, does not change order of shapes already at bottom', () => {
		editor.sendToBack([ids['A'], ids['C']])
	})

	it('When moving back to front...', () => {
		editor.sendBackward([ids['F'], ids['G']])

		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['C'],
			ids['D'],
			ids['F'],
			ids['G'],
			ids['E']
		)

		editor.sendBackward([ids['F'], ids['G']])

		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['C'],
			ids['F'],
			ids['G'],
			ids['D'],
			ids['E']
		)

		editor.sendBackward([ids['F'], ids['G']])
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['F'],
			ids['G'],
			ids['C'],
			ids['D'],
			ids['E']
		)

		editor.sendBackward([ids['F'], ids['G']])

		expectShapesInOrder(
			editor,
			ids['A'],
			ids['F'],
			ids['G'],
			ids['B'],
			ids['C'],
			ids['D'],
			ids['E']
		)

		editor.sendBackward([ids['F'], ids['G']])

		expectShapesInOrder(
			editor,
			ids['F'],
			ids['G'],
			ids['A'],
			ids['B'],
			ids['C'],
			ids['D'],
			ids['E']
		)

		editor
			.bringForward([ids['F'], ids['G']])
			.bringForward([ids['F'], ids['G']])
			.bringForward([ids['F'], ids['G']])
			.bringForward([ids['F'], ids['G']])
			.bringForward([ids['F'], ids['G']])

		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['C'],
			ids['D'],
			ids['E'],
			ids['F'],
			ids['G']
		)
	})
})

describe('When undoing and redoing...', () => {
	it('Undoes and redoes', () => {
		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['C'],
			ids['D'],
			ids['E'],
			ids['F'],
			ids['G']
		)

		editor.mark('before sending to back')
		editor.sendBackward([ids['F'], ids['G']])

		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['C'],
			ids['D'],
			ids['F'],
			ids['G'],
			ids['E']
		)

		editor.undo()

		expectShapesInOrder(
			editor,
			ids['A'],
			ids['B'],
			ids['C'],
			ids['D'],
			ids['E'],
			ids['F'],
			ids['G']
		)
		// .redo()
		// .expectShapesInOrder(ids['A'], ids['B'], ids['C'], ids['D'], ids['F'], ids['G'], ids['E'])
	})
})

describe('When shapes are parented...', () => {
	it('Sorted correctly by pageIndex', () => {
		editor.reparentShapes([ids['C']], ids['A']).reparentShapes([ids['B']], ids['D'])

		expectShapesInOrder(
			editor,
			ids['A'],
			ids['C'],
			ids['D'],
			ids['B'],
			ids['E'],
			ids['F'],
			ids['G']
		)
	})
})

test('When only two shapes exist', () => {
	editor = new TestEditor()
	editor.createShapes([
		{
			id: ids['A'],
			type: 'geo',
		},
		{
			id: ids['B'],
			type: 'geo',
		},
	])

	expectShapesInOrder(editor, ids['A'], ids['B'])

	editor.sendToBack([ids['B']])

	expectShapesInOrder(editor, ids['B'], ids['A'])

	editor.bringToFront([ids['B']])

	expectShapesInOrder(editor, ids['A'], ids['B'])

	editor.sendBackward([ids['B']])

	expectShapesInOrder(editor, ids['B'], ids['A'])

	editor.bringForward([ids['B']])

	expectShapesInOrder(editor, ids['A'], ids['B'])
})
