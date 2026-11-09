import { PageRecordType, TLSkippedWrite, createBindingId, createShapeId } from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from './TestEditor'

let editor: TestEditor
let skipped: TLSkippedWrite[]

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	frame: createShapeId('frame'),
	child: createShapeId('child'),
	missing: createShapeId('missing'),
}

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes([
		{ id: ids.box1, type: 'geo', x: 0, y: 0 },
		{ id: ids.box2, type: 'geo', x: 200, y: 0 },
	])
	skipped = []
	editor.on('write-skipped', (s) => skipped.push(s))
})

describe('getLastSkippedWrite', () => {
	it('is null until a write is skipped', () => {
		expect(editor.getLastSkippedWrite()).toBe(null)
		editor.updateShapes([{ id: ids.box1, type: 'geo', x: 50 }])
		expect(editor.getLastSkippedWrite()).toBe(null)
		expect(skipped).toEqual([])
	})

	it('returns the most recent skip, matching the event', () => {
		editor.updateShapes([{ id: ids.missing, type: 'geo', x: 50 }])
		expect(editor.getLastSkippedWrite()).toBe(skipped[0])
	})

	it('does not change return values', () => {
		editor.updateInstanceState({ isReadonly: true })
		expect(editor.updateShapes([{ id: ids.box1, type: 'geo', x: 50 }])).toBe(editor)
		expect(editor.deleteShapes([ids.box1])).toBe(editor)
		expect(editor.createShapes([{ type: 'geo' }])).toBe(editor)
	})
})

describe('readonly', () => {
	beforeEach(() => {
		editor.updateInstanceState({ isReadonly: true })
	})

	it('reports createShapes', () => {
		const id = createShapeId()
		editor.createShapes([{ id, type: 'geo' }])
		expect(editor.getShape(id)).toBeUndefined()
		expect(skipped).toEqual([{ reason: 'readonly', method: 'createShapes', ids: [] }])
	})

	it('reports updateShapes', () => {
		editor.updateShapes([{ id: ids.box1, type: 'geo', x: 50 }])
		expect(editor.getShape(ids.box1)!.x).toBe(0)
		expect(skipped).toEqual([{ reason: 'readonly', method: 'updateShapes', ids: [] }])
	})

	it('reports deleteShapes', () => {
		editor.deleteShapes([ids.box1, ids.box2])
		expect(editor.getShape(ids.box1)).toBeDefined()
		expect(skipped).toEqual([{ reason: 'readonly', method: 'deleteShapes', ids: [] }])
	})

	it('reports toggleLock', () => {
		editor.toggleLock([ids.box1])
		expect(editor.getShape(ids.box1)!.isLocked).toBe(false)
		expect(skipped).toEqual([{ reason: 'readonly', method: 'toggleLock', ids: [] }])
	})

	it('reports arranging methods', () => {
		editor.alignShapes([ids.box1, ids.box2], 'top')
		editor.groupShapes([ids.box1, ids.box2])
		expect(skipped.map((s) => s.method)).toEqual(['alignShapes', 'groupShapes'])
		expect(skipped.every((s) => s.reason === 'readonly')).toBe(true)
	})

	it('reports page writes', () => {
		const pageId = editor.getCurrentPageId()
		editor.renamePage(pageId, 'New name')
		editor.createPage({ name: 'Another page' })
		expect(skipped).toEqual([
			{ reason: 'readonly', method: 'renamePage', ids: [] },
			{ reason: 'readonly', method: 'createPage', ids: [] },
		])
	})

	it('reports updateShapes once, even for locked or missing ids', () => {
		editor.updateShapes([
			{ id: ids.missing, type: 'geo', x: 50 },
			{ id: ids.box1, type: 'geo', x: 50 },
		])
		expect(skipped).toEqual([{ reason: 'readonly', method: 'updateShapes', ids: [] }])
	})

	it('does not report the transient writes of copying', () => {
		editor.updateInstanceState({ isReadonly: false })
		const arrowId = createShapeId('arrow')
		editor.createShapes([{ id: arrowId, type: 'arrow', x: 0, y: 0 }])
		editor.createBindings([
			{
				type: 'arrow',
				fromId: arrowId,
				toId: ids.box1,
				props: {
					terminal: 'end',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: false,
					isPrecise: false,
				},
			},
		])
		editor.updateInstanceState({ isReadonly: true })
		skipped = []

		editor.getContentFromCurrentPage([arrowId])
		expect(skipped).toEqual([])
	})

	it('reports binding writes', () => {
		const id = createBindingId()
		editor.createBindings([{ id, type: 'arrow', fromId: ids.box1, toId: ids.box2 }])
		expect(skipped).toEqual([{ reason: 'readonly', method: 'createBindings', ids: [] }])
	})
})

describe('locked', () => {
	beforeEach(() => {
		editor.updateShapes([{ id: ids.box1, type: 'geo', isLocked: true }])
	})

	it('reports updates to a locked shape', () => {
		editor.updateShapes([
			{ id: ids.box1, type: 'geo', x: 50 },
			{ id: ids.box2, type: 'geo', x: 50 },
		])
		expect(editor.getShape(ids.box1)!.x).toBe(0)
		expect(editor.getShape(ids.box2)!.x).toBe(50)
		expect(skipped).toEqual([{ reason: 'locked', method: 'updateShapes', ids: [ids.box1] }])
	})

	it('does not report an update that unlocks the shape', () => {
		editor.updateShapes([{ id: ids.box1, type: 'geo', isLocked: false }])
		expect(editor.getShape(ids.box1)!.isLocked).toBe(false)
		expect(skipped).toEqual([])
	})

	it('does not report when ignoring shape locks', () => {
		editor.run(() => editor.updateShapes([{ id: ids.box1, type: 'geo', x: 50 }]), {
			ignoreShapeLock: true,
		})
		expect(editor.getShape(ids.box1)!.x).toBe(50)
		expect(skipped).toEqual([])
	})

	it('reports deletes of a locked shape', () => {
		editor.deleteShapes([ids.box1, ids.box2])
		expect(editor.getShape(ids.box1)).toBeDefined()
		expect(editor.getShape(ids.box2)).toBeUndefined()
		expect(skipped).toEqual([{ reason: 'locked', method: 'deleteShapes', ids: [ids.box1] }])
	})

	it('reports duplicates of a locked shape', () => {
		editor.duplicateShapes([ids.box1])
		expect(editor.getCurrentPageShapeIds().size).toBe(2)
		expect(skipped).toEqual([{ reason: 'locked', method: 'duplicateShapes', ids: [ids.box1] }])
	})

	it('reports updates to a shape under a locked ancestor', () => {
		editor.createShapes([
			{ id: ids.frame, type: 'frame', x: 500, y: 0, props: { w: 200, h: 200 } },
			{ id: ids.child, type: 'geo', parentId: ids.frame, x: 10, y: 10 },
		])
		editor.updateShapes([{ id: ids.frame, type: 'frame', isLocked: true }])
		skipped = []

		editor.updateShapes([{ id: ids.child, type: 'geo', x: 50 }])
		expect(editor.getShape(ids.child)!.x).toBe(10)
		expect(skipped).toEqual([{ reason: 'locked', method: 'updateShapes', ids: [ids.child] }])
	})

	it('reports toggleLock on a shape under a locked ancestor', () => {
		editor.createShapes([
			{ id: ids.frame, type: 'frame', x: 500, y: 0, props: { w: 200, h: 200 } },
			{ id: ids.child, type: 'geo', parentId: ids.frame, x: 10, y: 10 },
		])
		editor.updateShapes([{ id: ids.frame, type: 'frame', isLocked: true }])
		skipped = []

		editor.toggleLock([ids.child])
		expect(editor.getShape(ids.child)!.isLocked).toBe(false)
		expect(skipped).toEqual([{ reason: 'locked', method: 'updateShapes', ids: [ids.child] }])
	})

	it('reports animating a locked shape', () => {
		editor.animateShapes([{ id: ids.box1, type: 'geo', x: 50 }])
		expect(skipped).toEqual([{ reason: 'locked', method: 'animateShapes', ids: [ids.box1] }])
	})
})

describe('missing records', () => {
	it('reports updates to a missing shape', () => {
		editor.updateShapes([
			{ id: ids.missing, type: 'geo', x: 50 },
			{ id: ids.box1, type: 'geo', x: 50 },
		])
		expect(editor.getShape(ids.box1)!.x).toBe(50)
		expect(skipped).toEqual([{ reason: 'not-found', method: 'updateShapes', ids: [ids.missing] }])
	})

	it('reports toggleLock on a missing shape', () => {
		editor.toggleLock([ids.missing, ids.box1])
		expect(editor.getShape(ids.box1)!.isLocked).toBe(true)
		expect(skipped).toEqual([{ reason: 'not-found', method: 'toggleLock', ids: [ids.missing] }])
	})

	it('reports a missing parent, which is replaced', () => {
		const id = createShapeId()
		editor.createShapes([{ id, type: 'geo', parentId: ids.missing }])
		expect(editor.getShape(id)!.parentId).toBe(editor.getCurrentPageId())
		expect(skipped).toEqual([
			{ reason: 'missing-reference', method: 'createShapes', ids: [ids.missing] },
		])
	})

	it('reports a binding to a missing shape', () => {
		editor.createBindings([{ type: 'arrow', fromId: ids.box1, toId: ids.missing }])
		expect(editor.getBindingsInvolvingShape(ids.box1)).toEqual([])
		expect(skipped).toEqual([
			{ reason: 'missing-reference', method: 'createBindings', ids: [ids.missing] },
		])
	})

	it('reports updates to a missing binding', () => {
		const id = createBindingId()
		editor.updateBindings([{ id, type: 'arrow', props: {} }])
		expect(skipped).toEqual([{ reason: 'not-found', method: 'updateBindings', ids: [id] }])
	})

	it('reports moving shapes to a missing page', () => {
		const pageId = PageRecordType.createId('missing')
		editor.moveShapesToPage([ids.box1], pageId)
		expect(skipped).toEqual([
			{ reason: 'missing-reference', method: 'moveShapesToPage', ids: [pageId] },
		])
	})

	it('reports updates to a missing page', () => {
		const pageId = PageRecordType.createId('missing')
		editor.updatePage({ id: pageId, name: 'Nope' })
		expect(skipped).toEqual([{ reason: 'not-found', method: 'updatePage', ids: [pageId] }])
	})
})

describe('not allowed', () => {
	it('reports deleting the last page', () => {
		const pageId = editor.getCurrentPageId()
		editor.deletePage(pageId)
		expect(editor.getPage(pageId)).toBeDefined()
		expect(skipped).toEqual([{ reason: 'not-allowed', method: 'deletePage', ids: [pageId] }])
	})
})

describe('max-pages', () => {
	it('reports creating a page past the limit', () => {
		editor = new TestEditor({ options: { maxPages: 1 } })
		skipped = []
		editor.on('write-skipped', (s) => skipped.push(s))
		editor.createPage({ name: 'Too many' })
		expect(editor.getPages()).toHaveLength(1)
		expect(skipped).toEqual([{ reason: 'max-pages', method: 'createPage', ids: [] }])
	})
})

describe('max-shapes', () => {
	it('still emits max-shapes, and also write-skipped', () => {
		editor = new TestEditor({ options: { maxShapesPerPage: 1 } })
		skipped = []
		editor.on('write-skipped', (s) => skipped.push(s))
		const onMaxShapes = vi.fn()
		editor.on('max-shapes', onMaxShapes)

		const id = createShapeId()
		editor.createShapes([{ type: 'geo' }, { id, type: 'geo' }])
		expect(onMaxShapes).toHaveBeenCalledTimes(1)
		expect(skipped).toEqual([{ reason: 'max-shapes', method: 'createShapes', ids: [id] }])
	})
})
