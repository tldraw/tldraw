import { createShapeId } from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

vi.useFakeTimers()

it('animates a shape to its new position', () => {
	const id = createShapeId('box')
	editor.createShape({ id, type: 'geo', x: 0, y: 0 })
	editor.animateShapes([{ id, type: 'geo', x: 100, y: 100 }], { animation: { duration: 100 } })
	editor.emit('tick', 50)
	expect(editor.getShape(id)).toMatchObject({ x: 50, y: 50 })
	editor.emit('tick', 60)
	expect(editor.getShape(id)).toMatchObject({ x: 100, y: 100 })
})

it('does not move locked shapes', () => {
	const id = createShapeId('box')
	editor.createShape({ id, type: 'geo', x: 0, y: 0, isLocked: true })
	editor.animateShapes([{ id, type: 'geo', x: 100, y: 100 }], { animation: { duration: 100 } })
	// the intermediate frames must respect the lock too, otherwise the shape is moved by every
	// frame but the last and ends up stranded just short of the target
	editor.emit('tick', 50)
	expect(editor.getShape(id)).toMatchObject({ x: 0, y: 0 })
	editor.emit('tick', 60)
	expect(editor.getShape(id)).toMatchObject({ x: 0, y: 0 })
})
