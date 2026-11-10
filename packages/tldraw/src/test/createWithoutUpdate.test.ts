import {
	TLArrowShape,
	TLGeoShape,
	TLRecordChange,
	computed,
	createShapeId,
	toRichText,
} from '@tldraw/editor'
import { TestEditor } from './TestEditor'

// A rule that lets the user add shapes and nothing else.
const createOnly = (change: TLRecordChange<any>) => {
	const record = change.next ?? change.prev
	if (record.typeName === 'binding') return false
	return record.typeName !== 'shape' || change.type === 'create'
}

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor({ canChangeRecord: createOnly })
})

const shapesOfType = (type: string) => editor.getCurrentPageShapes().filter((s) => s.type === type)

it('lets a tool drag out the shape it is creating', () => {
	editor.setCurrentTool('geo').pointerDown(0, 0).pointerMove(200, 100).pointerUp(200, 100)

	const geo = shapesOfType('geo')[0] as TLGeoShape
	expect({ w: geo.props.w, h: geo.props.h }).toEqual({ w: 200, h: 100 })
})

it('stops allowing changes once the interaction is over', () => {
	editor.setCurrentTool('geo').pointerDown(0, 0).pointerMove(200, 100).pointerUp(200, 100)
	const geo = shapesOfType('geo')[0]

	editor.updateShapes([{ id: geo.id, type: 'geo', x: 500 }])
	editor.deleteShapes([geo.id])

	expect(editor.getShape(geo.id)).toEqual(geo)
	expect(editor.isShapeOrAncestorFrozen(geo)).toBe(true)
})

it('lets a new arrow bind to a shape', () => {
	const target = createShapeId('target')
	editor.createShapes([{ id: target, type: 'geo', x: 300, y: 300, props: { w: 100, h: 100 } }])
	editor.pointerMove(0, 0)

	editor.setCurrentTool('arrow').pointerDown(0, 0).pointerMove(350, 350).pointerUp(350, 350)

	const arrow = shapesOfType('arrow')[0] as TLArrowShape
	expect(editor.getBindingsFromShape(arrow, 'arrow').map((b) => b.toId)).toEqual([target])
})

it('lets the user type into a new text shape, and removes it if left empty', () => {
	editor.setCurrentTool('text').pointerDown(0, 0).pointerUp(0, 0)
	const text = shapesOfType('text')[0]
	expect(editor.getEditingShapeId()).toBe(text.id)

	editor.updateShapes([{ id: text.id, type: 'text', props: { richText: toRichText('hello') } }])
	expect(editor.getShape(text.id)).not.toEqual(text)

	editor.updateShapes([{ id: text.id, type: 'text', props: { richText: toRichText('') } }])
	editor.setEditingShape(null)
	expect(editor.getShape(text.id)).toBeUndefined()
})

it('still denies changes to shapes that were already there', () => {
	const old = createShapeId('old')
	editor.createShapes([{ id: old, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } }])
	editor.pointerMove(500, 500)
	const before = editor.getShape(old)

	editor.setCurrentTool('geo').pointerDown(300, 300)
	editor.updateShapes([{ id: old, type: 'geo', x: 50 }])
	editor.pointerUp(300, 300)

	expect(editor.getShape(old)).toEqual(before)
})

it('asks about each update to a shape being created as a create of the result', () => {
	// create only, and only black shapes
	editor = new TestEditor({
		canChangeRecord: (change) =>
			createOnly(change) && (change.next as any)?.props?.color !== 'blue',
	})
	editor.setCurrentTool('geo').pointerDown(0, 0).pointerMove(200, 100)
	const geo = shapesOfType('geo')[0] as TLGeoShape

	editor.updateShapes([{ id: geo.id, type: 'geo', props: { color: 'blue' } }])
	editor.pointerUp(200, 100)

	const after = editor.getShape<TLGeoShape>(geo.id)!
	expect({ w: after.props.w, h: after.props.h, color: after.props.color }).toEqual({
		w: 200,
		h: 100,
		color: geo.props.color,
	})
})

it('tells reactive readers when the interaction ends', () => {
	editor.setCurrentTool('geo').pointerDown(0, 0).pointerMove(200, 100)
	const geo = shapesOfType('geo')[0]
	const isFrozen = computed('isFrozen', () => editor.isShapeOrAncestorFrozen(geo.id))

	expect(isFrozen.get()).toBe(false)
	editor.pointerUp(200, 100)
	expect(isFrozen.get()).toBe(true)
})
