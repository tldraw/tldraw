import { createShapeId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

const ids = {
	boxA: createShapeId('boxA'),
	boxB: createShapeId('boxB'),
}

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes([
		{ id: ids.boxA, type: 'geo', x: 0, y: 0 },
		{ id: ids.boxB, type: 'geo', x: 200, y: 200 },
	])
})

afterEach(() => {
	editor?.dispose()
})

describe('custom changeDocument rules', () => {
	beforeEach(() => {
		editor.allow.changeDocument.setRule({
			id: 'deny-all',
			message: 'Changes are not allowed',
			test: () => false,
		})
	})

	it('blocks createShapes', () => {
		const id = createShapeId('new')
		editor.createShapes([{ id, type: 'geo', x: 0, y: 0 }])
		expect(editor.getShape(id)).toBeUndefined()
	})

	it('blocks updateShapes', () => {
		editor.updateShapes([{ id: ids.boxA, type: 'geo', x: 999 }])
		expect(editor.getShape(ids.boxA)!.x).toBe(0)
	})

	it('blocks deleteShapes', () => {
		editor.deleteShapes([ids.boxA])
		expect(editor.getShape(ids.boxA)).toBeDefined()
	})

	it('blocks toggleLock', () => {
		editor.toggleLock([ids.boxA])
		expect(editor.getShape(ids.boxA)!.isLocked).toBe(false)
	})

	it('blocks createPage and deletePage', () => {
		const pageCount = editor.getPages().length
		editor.createPage({ name: 'denied' })
		expect(editor.getPages()).toHaveLength(pageCount)

		editor.deletePage(editor.getCurrentPageId())
		expect(editor.getPages()).toHaveLength(pageCount)
	})

	it('allows changes again once the rule is removed', () => {
		editor.allow.changeDocument.removeRule('deny-all')
		editor.updateShapes([{ id: ids.boxA, type: 'geo', x: 999 }])
		expect(editor.getShape(ids.boxA)!.x).toBe(999)
	})
})

describe('custom moveCamera rules', () => {
	beforeEach(() => {
		editor.allow.moveCamera.setRule({
			id: 'deny-all',
			message: 'The camera may not move',
			test: () => false,
		})
	})

	it('blocks setCamera', () => {
		const camera = editor.getCamera()
		editor.setCamera({ x: camera.x + 100, y: camera.y + 100 })
		expect(editor.getCamera()).toMatchObject({ x: camera.x, y: camera.y })
	})

	it('is bypassed by force', () => {
		const camera = editor.getCamera()
		editor.setCamera({ x: camera.x + 100, y: camera.y + 100 }, { force: true })
		expect(editor.getCamera()).toMatchObject({ x: camera.x + 100, y: camera.y + 100 })
	})
})

describe('custom per-shape rules', () => {
	it('deleteShape rules filter which shapes are deleted', () => {
		editor.allow.deleteShape.setRule({
			id: 'protect-box-a',
			message: 'This shape is protected',
			test: (shape) => shape.id !== ids.boxA,
		})

		editor.deleteShapes([ids.boxA, ids.boxB])
		expect(editor.getShape(ids.boxA)).toBeDefined()
		expect(editor.getShape(ids.boxB)).toBeUndefined()
	})

	it('changeShape rules block updates to matching shapes only', () => {
		editor.allow.changeShape.setRule({
			id: 'freeze-box-a',
			message: 'This shape is frozen',
			test: (shape) => shape.id !== ids.boxA,
		})

		editor.updateShapes([
			{ id: ids.boxA, type: 'geo', x: 999 },
			{ id: ids.boxB, type: 'geo', x: 999 },
		])
		expect(editor.getShape(ids.boxA)!.x).toBe(0)
		expect(editor.getShape(ids.boxB)!.x).toBe(999)
	})
})
