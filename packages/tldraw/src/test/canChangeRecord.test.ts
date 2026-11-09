import {
	Editor,
	PageRecordType,
	TLPageId,
	TLRecord,
	TLRecordChange,
	createShapeId,
	isPageId,
} from '@tldraw/editor'
import { TestEditor } from './TestEditor'

// Teacher and two students: each student owns one page and may only change records on it.
const pageA = PageRecordType.createId('a')
const pageB = PageRecordType.createId('b')
const shapeA = createShapeId('a')
const shapeB = createShapeId('b')

let me = 'teacher'

type Change = TLRecordChange<any>
const recordOf = (change: Change) => (change.next ?? change.prev) as TLRecord

// A new shape isn't in the store yet, so the rule walks parentId itself.
function pageOf(record: TLRecord, editor: Editor): TLPageId | undefined {
	if (record.typeName === 'page') return record.id
	if (record.typeName !== 'shape') return undefined
	if (isPageId(record.parentId)) return record.parentId
	return editor.getAncestorPageId(editor.getShape(record.parentId))
}

function canChangeRecord(change: Change, editor: Editor) {
	const page = pageOf(recordOf(change), editor)
	if (!page || me === 'teacher') return true
	return editor.getPage(page)?.meta.owner === me
}

function setup(
	options: { canChangeRecord?(change: Change, editor: Editor): boolean } = { canChangeRecord }
) {
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

const update = (record: TLRecord): Change => ({ type: 'update', prev: record, next: record })

describe('canChangeRecord', () => {
	it('answers per record', () => {
		const editor = setup()
		expect(editor.canChangeRecord(update(editor.getShape(shapeA)!))).toBe(true)
		expect(editor.canChangeRecord(update(editor.getShape(shapeB)!))).toBe(false)
		expect(editor.canChangeRecord(update(editor.getPage(pageB)!))).toBe(false)
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
		expect(editor.canChangeRecord(update(editor.getShape(shapeB)!))).toBe(true)
	})

	it('still blocks everything when readonly', () => {
		const editor = setup()
		editor.updateInstanceState({ isReadonly: true })
		expect(editor.canChangeRecord(update(editor.getShape(shapeA)!))).toBe(false)
	})
})

describe('canChangeRecord by operation', () => {
	it('lets me edit existing shapes but not delete them', () => {
		const editor = setup({ canChangeRecord: (change) => change.type !== 'delete' })
		editor.updateShapes([{ id: shapeA, type: 'geo', x: 50 }])
		expect(editor.getShape(shapeA)!.x).toBe(50)
		editor.deleteShapes([shapeA])
		expect(editor.getShape(shapeA)).toBeDefined()
		expect(
			editor.canChangeRecord({ type: 'delete', prev: editor.getShape(shapeA)!, next: null })
		).toBe(false)
		expect(editor.canChangeRecord(update(editor.getShape(shapeA)!))).toBe(true)
	})

	it('lets me create but not edit or delete', () => {
		const editor = setup({ canChangeRecord: (change) => change.type === 'create' })
		const mine = createShapeId('mine')
		editor.createShapes([{ id: mine, type: 'geo', parentId: pageA }])
		expect(editor.getShape(mine)).toBeDefined()
		editor.updateShapes([{ id: mine, type: 'geo', x: 50 }])
		expect(editor.getShape(mine)!.x).not.toBe(50)
		editor.deleteShapes([mine])
		expect(editor.getShape(mine)).toBeDefined()
	})

	it('judges an update once, with both ends', () => {
		const seen: Change[] = []
		const editor = setup({
			canChangeRecord: (change) => {
				seen.push(change)
				return true
			},
		})
		seen.length = 0
		editor.updateShapes([{ id: shapeA, type: 'geo', x: 50 }])
		const updates = seen.filter((c) => c.type === 'update')
		expect(updates).toHaveLength(1)
		expect([updates[0].prev.x, updates[0].next.x]).toEqual([0, 50])
	})

	it('judges the copies of a duplicate as creates', () => {
		const onlyCreate = setup({ canChangeRecord: (change) => change.type === 'create' })
		onlyCreate.setCurrentPage(pageA)
		onlyCreate.duplicateShapes([shapeA])
		expect([...onlyCreate.getPageShapeIds(pageA)]).toHaveLength(2)

		let denyCreate = false
		const noCreate = setup({
			canChangeRecord: (change) => !(denyCreate && change.type === 'create'),
		})
		denyCreate = true
		noCreate.setCurrentPage(pageA)
		noCreate.duplicateShapes([shapeA])
		expect([...noCreate.getPageShapeIds(pageA)]).toHaveLength(1)
	})
})
