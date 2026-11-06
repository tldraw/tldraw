import { atom, createShapeId, PageRecordType, TLShape } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

// The `isShapeLocked` and `isPageReadonly` editor options: locks and read-only pages for one
// editor only, for example from permission rules.

const box = createShapeId('box')
const frame = createShapeId('frame')
const child = createShapeId('child')
const page2 = PageRecordType.createId('page2')

let editor: TestEditor
const lockedIds = atom<string[]>('locked ids', [])
const readonlyPages = atom<string[]>('readonly pages', [])

beforeEach(() => {
	lockedIds.set([])
	readonlyPages.set([])
	editor = new TestEditor({
		isShapeLocked: (shape: TLShape) => lockedIds.get().includes(shape.id),
		isPageReadonly: (page) => readonlyPages.get().includes(page.id),
	})
	editor.createShapes([
		{ id: box, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
		{ id: frame, type: 'frame', x: 300, y: 0, props: { w: 400, h: 400 } },
		{ id: child, type: 'geo', parentId: frame, x: 50, y: 50, props: { w: 50, h: 50 } },
	])
	editor.createPage({ id: page2, name: 'Page 2' })
})

afterEach(() => editor?.dispose())

describe('isShapeLocked option', () => {
	it('locks a shape for this editor, without changing its isLocked prop', () => {
		lockedIds.set([box])
		expect(editor.isShapeLocked(box)).toBe(true)
		expect(editor.getShape(box)!.isLocked).toBe(false)
		editor.updateShapes([{ id: box, type: 'geo', x: 200 }])
		editor.deleteShapes([box])
		expect(editor.getShape(box)!.x).toBe(0)
		editor.selectAll()
		expect(editor.getSelectedShapeIds()).not.toContain(box)
	})

	it('locks the shape only, not its children', () => {
		lockedIds.set([frame])
		expect(editor.isShapeOrAncestorLocked(child)).toBe(false)
		editor.updateShapes([{ id: child, type: 'geo', x: 70 }])
		expect(editor.getShape(child)!.x).toBe(70)
		// new shapes can still go into the frame
		editor.setCurrentTool('geo')
		editor.pointerDown(500, 200).pointerMove(560, 260).pointerUp()
		const created = editor.getOnlySelectedShape()!
		expect(created.parentId).toBe(frame)
	})

	it('a stored lock still locks the children', () => {
		editor.updateShapes([{ id: frame, type: 'frame', isLocked: true }])
		expect(editor.isShapeOrAncestorLocked(child)).toBe(true)
	})

	it('is not lifted by unlock', () => {
		editor.updateShapes([{ id: box, type: 'geo', isLocked: true }])
		lockedIds.set([box])
		editor.updateShapes([{ id: box, type: 'geo', isLocked: false, x: 500 }])
		expect(editor.getShape(box)).toMatchObject({ isLocked: true, x: 0 })
		editor.toggleLock([box])
		expect(editor.getShape(box)!.isLocked).toBe(true)
	})

	it('still lets arrows bind to the shape: a binding does not change it', () => {
		lockedIds.set([box])
		editor.setCurrentTool('arrow')
		editor.pointerDown(-100, 50).pointerMove(50, 50).pointerUp()
		expect(editor.getBindingsToShape(box, 'arrow')).toHaveLength(1)
	})

	it('releases a shape that becomes locked while selected', () => {
		editor.select(box)
		lockedIds.set([box])
		vi.advanceTimersByTime(10)
		expect(editor.getSelectedShapeIds()).toEqual([])
	})
})

describe('isPageReadonly option', () => {
	it('makes the editor read-only on that page only', () => {
		readonlyPages.set([page2])
		expect(editor.getIsReadonly()).toBe(false)
		editor.setCurrentPage(page2)
		expect(editor.getIsReadonly()).toBe(true)
	})

	it('does not move shapes onto a read-only page', () => {
		readonlyPages.set([page2])
		editor.select(box)
		expect(() => editor.moveShapesToPage([box], page2)).not.toThrow()
		expect(editor.getShape(box)!.parentId).not.toBe(page2)
		expect(editor.getCurrentPageId()).not.toBe(page2)
	})
})
