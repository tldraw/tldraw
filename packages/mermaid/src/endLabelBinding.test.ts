import { createShapeId, Editor, TLArrowShape, TLShapeId, toRichText } from 'tldraw'
import { MERMAID_END_LABEL_BINDING_TYPE } from './endLabelBinding'
import { createEditor } from './test/createEditor'

const ids = {
	a: createShapeId('a'),
	b: createShapeId('b'),
	c: createShapeId('c'),
	arrow: createShapeId('arrow'),
	label: createShapeId('label'),
}

/** Box `a` at the origin, box `b` 400px to its right, an arrow from `a` to `b`, labelled at its end. */
function createLabelledArrow(editor: Editor) {
	editor.createShapes([
		{ id: ids.a, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
		{ id: ids.b, type: 'geo', x: 400, y: 0, props: { w: 100, h: 100 } },
		{ id: ids.c, type: 'geo', x: 400, y: 400, props: { w: 100, h: 100 } },
		{ id: ids.arrow, type: 'arrow', props: { start: { x: 0, y: 0 }, end: { x: 100, y: 0 } } },
		{ id: ids.label, type: 'text', props: { richText: toRichText('*'), size: 's' } },
	])
	editor.createBindings([bindArrow('start', ids.a), bindArrow('end', ids.b)])
	editor.createBinding({
		type: MERMAID_END_LABEL_BINDING_TYPE,
		fromId: ids.arrow,
		toId: ids.label,
		props: { terminal: 'end' },
	})
}

function bindArrow(terminal: 'start' | 'end', toId: TLShapeId) {
	return {
		type: 'arrow' as const,
		fromId: ids.arrow,
		toId,
		props: { terminal, normalizedAnchor: { x: 0.5, y: 0.5 }, isExact: false, isPrecise: false },
	}
}

function labelCenter(editor: Editor, labelId = ids.label) {
	const { x, y } = editor.getShapePageBounds(labelId)!.center
	return { x: Math.round(x), y: Math.round(y) }
}

function watchedShapeIds(editor: Editor, labelId = ids.label) {
	return editor
		.getBindingsToShape(labelId, MERMAID_END_LABEL_BINDING_TYPE)
		.map((binding) => binding.fromId)
		.sort()
}

describe('MermaidEndLabelBindingUtil', () => {
	it('places the label beside the end of the arrow, clear of the line', () => {
		const editor = createEditor()
		createLabelledArrow(editor)

		const center = labelCenter(editor)
		// The arrow runs right along y = 50 and ends at b's left edge, x = 400.
		expect(center.x).toBeGreaterThan(300)
		expect(center.x).toBeLessThan(400)
		expect(Math.abs(center.y - 50)).toBeGreaterThan(5)
	})

	it('watches the shapes the arrow joins as well as the arrow', () => {
		const editor = createEditor()
		createLabelledArrow(editor)

		expect(watchedShapeIds(editor)).toEqual([ids.a, ids.arrow, ids.b].sort())
	})

	it('follows a joined shape that moves, though the arrow record does not change', () => {
		const editor = createEditor()
		createLabelledArrow(editor)
		const before = labelCenter(editor)

		editor.updateShape({ id: ids.b, type: 'geo', x: 400, y: 300 })

		expect(labelCenter(editor).y).toBeGreaterThan(before.y + 100)
	})

	it('goes back with the shapes on undo', () => {
		const editor = createEditor()
		createLabelledArrow(editor)
		const before = labelCenter(editor)
		editor.markHistoryStoppingPoint()

		editor.updateShape({ id: ids.b, type: 'geo', x: 400, y: 300 })
		editor.undo()

		expect(labelCenter(editor)).toEqual(before)
	})

	it('follows the arrow onto a shape it is dragged to', () => {
		const editor = createEditor()
		createLabelledArrow(editor)

		const endBinding = editor
			.getBindingsFromShape(ids.arrow, 'arrow')
			.find((binding) => binding.toId === ids.b)!
		editor.deleteBinding(endBinding)
		editor.createBinding(bindArrow('end', ids.c))
		editor.updateShape<TLArrowShape>({ id: ids.arrow, type: 'arrow', props: { bend: 0 } })

		expect(watchedShapeIds(editor)).toEqual([ids.a, ids.arrow, ids.c].sort())
		const before = labelCenter(editor)
		editor.updateShape({ id: ids.c, type: 'geo', x: 400, y: 700 })
		expect(labelCenter(editor).y).toBeGreaterThan(before.y + 100)
	})

	it('deletes the label with its arrow, but not with a shape the arrow joins', () => {
		const editor = createEditor()
		createLabelledArrow(editor)

		editor.deleteShape(ids.b)
		expect(editor.getShape(ids.label)).toBeDefined()

		editor.deleteShape(ids.arrow)
		expect(editor.getShape(ids.label)).toBeUndefined()
	})

	it('keeps a duplicated label with the duplicated arrow', () => {
		const editor = createEditor()
		createLabelledArrow(editor)
		const original = labelCenter(editor)

		editor.duplicateShapes([ids.a, ids.b, ids.arrow, ids.label], { x: 0, y: 1000 })

		const copy = editor
			.getCurrentPageShapes()
			.find((shape) => shape.type === 'text' && shape.id !== ids.label)!
		expect(labelCenter(editor, copy.id)).toEqual({ x: original.x, y: original.y + 1000 })
	})
})
