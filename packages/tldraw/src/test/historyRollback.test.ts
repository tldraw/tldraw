import { createShapeId, transact, transaction } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor
const a = createShapeId('a')
const b = createShapeId('b')
const c = createShapeId('c')

beforeEach(() => {
	editor = new TestEditor()
})

describe('history after a rolled-back transaction', () => {
	it('drops changes from a throwing editor.run the caller catches', () => {
		editor.createShapes([{ id: c, type: 'geo', x: 0 }])
		editor.markHistoryStoppingPoint('start')
		expect(() =>
			editor.run(() => {
				editor.createShapes([{ id: a, type: 'geo' }])
				editor.updateShapes([{ id: c, type: 'geo', x: 500 }])
				throw new Error('boom')
			})
		).toThrow('boom')
		expect(editor.getShape(a)).toBeUndefined()
		expect(editor.getShape(c)!.x).toBe(0)

		editor.markHistoryStoppingPoint('b')
		editor.createShapes([{ id: b, type: 'geo' }])
		editor.undo()
		editor.undo()
		editor.redo()
		editor.redo()
		expect(editor.getShape(a)).toBeUndefined()
		expect(editor.getShape(b)).toBeDefined()
		expect(editor.getShape(c)!.x).toBe(0)
	})

	it('drops changes from an editor op inside an outer transaction that throws', () => {
		editor.markHistoryStoppingPoint('start')
		expect(() =>
			transact(() => {
				editor.createShapes([{ id: a, type: 'geo' }])
				throw new Error('outer')
			})
		).toThrow('outer')
		expect(editor.getShape(a)).toBeUndefined()

		editor.markHistoryStoppingPoint('b')
		editor.createShapes([{ id: b, type: 'geo' }])
		editor.undo()
		editor.redo()
		expect(editor.getShape(a)).toBeUndefined()
		expect(editor.getShape(b)).toBeDefined()
	})

	it('drops only a nested transaction that rolls back', () => {
		editor.markHistoryStoppingPoint('start')
		editor.run(() => {
			editor.createShapes([{ id: b, type: 'geo' }])
			transaction((rollback) => {
				editor.createShapes([{ id: a, type: 'geo' }])
				editor.updateShapes([{ id: b, type: 'geo', x: 500 }])
				rollback()
			})
		})
		expect(editor.getShape(a)).toBeUndefined()
		expect(editor.getShape(b)!.x).toBe(0)

		editor.undo()
		expect(editor.getShape(b)).toBeUndefined()
		editor.redo()
		expect(editor.getShape(a)).toBeUndefined()
		expect(editor.getShape(b)!.x).toBe(0)
	})

	it('keeps the pending diff when a mark inside a rolled-back run is undone', () => {
		editor.markHistoryStoppingPoint('start')
		editor.createShapes([{ id: b, type: 'geo' }])
		expect(() =>
			editor.run(() => {
				editor.markHistoryStoppingPoint('inner')
				editor.createShapes([{ id: a, type: 'geo' }])
				throw new Error('boom')
			})
		).toThrow()
		editor.undo()
		expect(editor.getShape(b)).toBeUndefined()
		editor.redo()
		expect(editor.getShape(b)).toBeDefined()
		expect(editor.getShape(a)).toBeUndefined()
	})

	it('restores a pending update when a rolled-back run updates the same record again', () => {
		editor.createShapes([{ id: c, type: 'geo', x: 0 }])
		editor.markHistoryStoppingPoint('start')
		editor.updateShapes([{ id: c, type: 'geo', x: 100 }])
		expect(() =>
			editor.run(() => {
				editor.updateShapes([{ id: c, type: 'geo', x: 500 }])
				throw new Error('boom')
			})
		).toThrow('boom')
		expect(editor.getShape(c)!.x).toBe(100)

		editor.undo()
		expect(editor.getShape(c)!.x).toBe(0)
		editor.redo()
		expect(editor.getShape(c)!.x).toBe(100)
	})

	it('keeps changes made before the rolled-back transaction', () => {
		editor.markHistoryStoppingPoint('start')
		editor.createShapes([{ id: b, type: 'geo' }])
		expect(() =>
			editor.run(() => {
				editor.createShapes([{ id: a, type: 'geo' }])
				throw new Error('boom')
			})
		).toThrow()
		expect(editor.getCanUndo()).toBe(true)
		editor.undo()
		expect(editor.getShape(b)).toBeUndefined()
		editor.redo()
		expect(editor.getShape(b)).toBeDefined()
		expect(editor.getShape(a)).toBeUndefined()
	})
})
