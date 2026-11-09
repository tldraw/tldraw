import { Editor, PageRecordType, TLPageId, TLRecord, createShapeId, isPageId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

// Teacher and two students: each student owns one page and may only change records on it.
const pageA = PageRecordType.createId('a')
const pageB = PageRecordType.createId('b')
const shapeA = createShapeId('a')
const shapeB = createShapeId('b')

let me = 'teacher'

// A new shape isn't in the store yet, so the rule walks parentId itself.
function pageOf(record: TLRecord, editor: Editor): TLPageId | undefined {
	if (record.typeName === 'page') return record.id
	if (record.typeName !== 'shape') return undefined
	if (isPageId(record.parentId)) return record.parentId
	return editor.getAncestorPageId(editor.getShape(record.parentId))
}

function canChangeRecord(record: TLRecord, editor: Editor) {
	const page = pageOf(record, editor)
	if (!page || me === 'teacher') return true
	return editor.getPage(page)?.meta.owner === me
}

function setup(options: { canChangeRecord?: typeof canChangeRecord } = { canChangeRecord }) {
	me = 'teacher'
	const editor = new TestEditor(options)
	editor.createPage({ id: pageA, name: 'A', meta: { owner: 'studentA' } })
	editor.createPage({ id: pageB, name: 'B', meta: { owner: 'studentB' } })
	editor.createShapes([
		{ id: shapeA, type: 'geo', parentId: pageA, x: 0, y: 0 },
		{ id: shapeB, type: 'geo', parentId: pageB, x: 0, y: 0 },
	])
	me = 'studentA'
	return editor
}

describe('canChangeRecord', () => {
	it('answers per record', () => {
		const editor = setup()
		expect(editor.canChangeRecord(editor.getShape(shapeA)!)).toBe(true)
		expect(editor.canChangeRecord(editor.getShape(shapeB)!)).toBe(false)
		expect(editor.canChangeRecord(editor.getPage(pageB)!)).toBe(false)
	})

	it('lets updates through on my page and drops them on the other', () => {
		const editor = setup()
		editor.updateShapes([
			{ id: shapeA, type: 'geo', x: 50 },
			{ id: shapeB, type: 'geo', x: 50 },
		])
		expect(editor.getShape(shapeA)!.x).toBe(50)
		expect(editor.getShape(shapeB)!.x).toBe(0)
	})

	it('drops deletes on the other page', () => {
		const editor = setup()
		editor.deleteShapes([shapeA, shapeB])
		expect(editor.getShape(shapeA)).toBeUndefined()
		expect(editor.getShape(shapeB)).toBeDefined()
	})

	it('judges a new shape by its resolved parent', () => {
		const editor = setup()
		const mine = createShapeId('mine')
		const theirs = createShapeId('theirs')
		editor.createShapes([
			{ id: mine, type: 'geo', parentId: pageA },
			{ id: theirs, type: 'geo', parentId: pageB },
		])
		expect(editor.getShape(mine)).toBeDefined()
		expect(editor.getShape(theirs)).toBeUndefined()
	})

	it('guards pages too', () => {
		const editor = setup()
		editor.renamePage(pageA, 'mine')
		editor.renamePage(pageB, 'theirs')
		expect(editor.getPage(pageA)!.name).toBe('mine')
		expect(editor.getPage(pageB)!.name).toBe('B')
		editor.deletePage(pageB)
		expect(editor.getPage(pageB)).toBeDefined()
	})

	it('follows the rule when it changes', () => {
		const editor = setup()
		editor.updateShapes([{ id: shapeB, type: 'geo', x: 20 }])
		expect(editor.getShape(shapeB)!.x).toBe(0)
		me = 'studentB'
		editor.updateShapes([{ id: shapeB, type: 'geo', x: 50 }])
		expect(editor.getShape(shapeB)!.x).toBe(50)
	})

	it('denial beats the unlock exception', () => {
		const editor = setup()
		me = 'teacher'
		editor.updateShapes([{ id: shapeB, type: 'geo', isLocked: true }])
		me = 'studentA'
		editor.updateShapes([{ id: shapeB, type: 'geo', isLocked: false }])
		expect(editor.getShape(shapeB)!.isLocked).toBe(true)
	})

	it('still lets me unlock my own locked shape', () => {
		const editor = setup()
		editor.toggleLock([shapeA])
		expect(editor.getShape(shapeA)!.isLocked).toBe(true)
		editor.updateShapes([{ id: shapeA, type: 'geo', isLocked: false }])
		expect(editor.getShape(shapeA)!.isLocked).toBe(false)
	})

	it('changes nothing when unset', () => {
		const editor = setup({})
		editor.updateShapes([{ id: shapeB, type: 'geo', x: 50 }])
		expect(editor.getShape(shapeB)!.x).toBe(50)
		expect(editor.canChangeRecord(editor.getShape(shapeB)!)).toBe(true)
	})

	it('still blocks everything when readonly', () => {
		const editor = setup()
		editor.updateInstanceState({ isReadonly: true })
		expect(editor.canChangeRecord(editor.getShape(shapeA)!)).toBe(false)
	})
})
