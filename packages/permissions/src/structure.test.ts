import type { UnknownRecord } from '@tldraw/store'
import { createStructureRule, type TLStructureRuleArgs } from './structure'

// Only the fields the rule reads; ids stay plain strings.
type Rec = UnknownRecord & Record<string, any>
const rec = (r: Record<string, any>) => r as Rec
const page = (id: string) => rec({ id, typeName: 'page' })
const shape = (id: string, parentId: string) => rec({ id, typeName: 'shape', parentId })
const binding = (id: string, fromId: string, toId: string) =>
	rec({ id, typeName: 'binding', fromId, toId })

const create = (next: Rec) => ({ type: 'create' as const, prev: null, next })
const update = (prev: Rec, next: Rec) => ({ type: 'update' as const, prev, next })
const del = (prev: Rec) => ({ type: 'delete' as const, prev, next: null })

/** Judges `changes` against a document of `records`. */
function judge(records: Rec[], ...changes: TLStructureRuleArgs['changes'][number][]) {
	const after = new Map<string, UnknownRecord>(records.map((r) => [r.id, r]))
	for (const { prev, next } of changes) {
		if (next) after.set(next.id, next)
		else after.delete(prev!.id)
	}
	return createStructureRule()({ changes, after: (id) => after.get(id) })
}

const pageA = page('page:a')
const pageB = page('page:b')
const frame = shape('shape:frame', 'page:a')
const child = shape('shape:child', 'shape:frame')
const other = shape('shape:other', 'page:a')
const arrow = shape('shape:arrow', 'page:a')
const doc = [pageA, pageB, frame, child, other, arrow]

describe('createStructureRule', () => {
	describe('parents', () => {
		it('allows a shape created on a page or in a frame, including one created in the same push', () => {
			const newFrame = shape('shape:new-frame', 'page:a')
			const inside = shape('shape:inside', 'shape:new-frame')
			expect(judge(doc, create(inside), create(newFrame))).toBeNull()
		})

		it('refuses a shape whose parent is missing', () => {
			expect(judge(doc, create(shape('shape:x', 'shape:gone')))).toEqual({
				reason: 'dangling parent',
				ids: ['shape:x'],
			})
		})

		it('refuses a shape whose parent is not a shape or page', () => {
			const asset = rec({ id: 'asset:1', typeName: 'asset' })
			expect(judge([...doc, asset], create(shape('shape:x', 'asset:1')))?.reason).toBe(
				'dangling parent'
			)
		})

		it('refuses a reparent that makes a cycle', () => {
			const refusal = judge(doc, update(frame, { ...frame, parentId: 'shape:child' }))
			expect(refusal).toEqual({ reason: 'dangling parent', ids: ['shape:frame'] })
		})

		it('refuses reparenting into a frame deleted in the same push', () => {
			expect(
				judge(doc, update(other, { ...other, parentId: 'shape:frame' }), del(frame), del(child))
					?.reason
			).toBe('dangling parent')
		})
	})

	describe('bindings', () => {
		it('allows a binding between two shapes on one page', () => {
			expect(judge(doc, create(binding('binding:1', 'shape:arrow', 'shape:child')))).toBeNull()
		})

		it('refuses a binding to a missing shape or across pages', () => {
			const onB = shape('shape:on-b', 'page:b')
			expect(judge(doc, create(binding('binding:1', 'shape:arrow', 'shape:gone')))?.reason).toBe(
				'dangling binding'
			)
			expect(
				judge([...doc, onB], create(binding('binding:1', 'shape:arrow', 'shape:on-b')))?.reason
			).toBe('split binding')
		})
	})

	describe('records that were already broken', () => {
		const orphan = shape('shape:orphan', 'shape:gone')
		const stale = binding('binding:stale', 'shape:arrow', 'shape:gone')
		const broken = [...doc, orphan, stale]

		it('lets an orphan be edited without fixing its parent', () => {
			expect(judge(broken, update(orphan, rec({ ...orphan, x: 10 })))).toBeNull()
		})

		it('lets an orphan be repaired or deleted', () => {
			expect(judge(broken, update(orphan, { ...orphan, parentId: 'page:a' }))).toBeNull()
			expect(judge(broken, del(orphan))).toBeNull()
		})

		it('does not block unrelated deletes', () => {
			expect(judge(broken, del(other))).toBeNull()
		})

		it('lets a stale binding be edited or deleted', () => {
			expect(judge(broken, update(stale, { ...stale, meta: { a: 1 } }))).toBeNull()
			expect(judge(broken, del(stale))).toBeNull()
		})
	})

	// Known gap: finding what a delete or a page move leaves behind needs a lookup of what points
	// at a record. These pin today's behaviour so the change is deliberate when the lookup lands.
	describe('not checked yet', () => {
		it('allows deleting a frame that leaves a child behind', () => {
			expect(judge(doc, del(frame))).toBeNull()
		})

		it('allows deleting a shape that leaves a binding to it', () => {
			const b = binding('binding:1', 'shape:arrow', 'shape:other')
			expect(judge([...doc, b], del(other))).toBeNull()
		})

		it('allows moving a shape to another page while a binding still ties it to this one', () => {
			const b = binding('binding:1', 'shape:arrow', 'shape:child')
			expect(judge([...doc, b], update(frame, { ...frame, parentId: 'page:b' }))).toBeNull()
		})

		it('allows deleting the last page', () => {
			expect(judge([pageA], del(pageA))).toBeNull()
		})
	})

	it('ignores records it has no rules for', () => {
		const comment = rec({ id: 'comment:1', typeName: 'comment' })
		expect(judge(doc, create(comment))).toBeNull()
	})
})
