import { UnknownRecord } from '@tldraw/store'
import { describe, expect, it } from 'vitest'
import { ownShapesOnly, pageReadAccess, stampOwner } from './rules'
import { createTransaction, TLAccess, TLRecordReader } from './TLPermissions'

type Rec = UnknownRecord & Record<string, any>
const rec = (fields: Record<string, any>) => fields as Rec

function reader(records: Rec[]): TLRecordReader<Rec> {
	const byId = new Map<string, Rec>(records.map((r) => [r.id, r]))
	return { get: (id) => byId.get(id), all: () => byId.values() }
}

const page = (id: string, meta: Record<string, unknown> = {}) => rec({ id, typeName: 'page', meta })
const shape = (id: string, parentId: string, ownerId = 'ann', props: object = {}) =>
	rec({ id, typeName: 'shape', type: 'geo', parentId, meta: { ownerId }, props })

describe('pageReadAccess', () => {
	const canRead = pageReadAccess<Rec>({ canSeePage: (p) => !p.meta.private })
	const read = (record: Rec, records: Rec[]) =>
		canRead(record, {
			access: { userId: 'eve', abilities: [] },
			can: () => false,
			records: reader(records),
		})

	it('shows records on a visible page and hides records on a hidden one', () => {
		const records = [page('page:a'), page('page:b', { private: true })]
		expect(read(shape('shape:1', 'page:a'), records)).toBe(true)
		expect(read(shape('shape:2', 'page:b'), records)).toBe(false)
	})

	it('hides records whose page cannot be found', () => {
		// the page was deleted, the parent is missing, the parents form a cycle
		expect(read(shape('shape:1', 'page:gone'), [])).toBe(false)
		expect(read(shape('shape:1', 'shape:missing'), [page('page:a')])).toBe(false)
		const loop = [shape('shape:x', 'shape:y'), shape('shape:y', 'shape:x')]
		expect(read(loop[0], loop)).toBe(false)
		const binding = rec({ id: 'binding:1', typeName: 'binding', fromId: 'shape:gone', meta: {} })
		expect(read(binding, [])).toBe(false)
	})

	it('shows records that have no page', () => {
		expect(read(rec({ id: 'document:document', typeName: 'document' }), [])).toBe(true)
		expect(read(rec({ id: 'asset:1', typeName: 'asset' }), [])).toBe(true)
	})
})

describe('stampOwner', () => {
	const stamp = stampOwner<Rec>()
	const ann: TLAccess = { userId: 'ann', abilities: ['edit'] }

	it("makes a copy of someone else's shape yours", () => {
		expect(stamp(shape('shape:1', 'page:a', 'bob'), ann).meta.ownerId).toBe('ann')
		expect(stamp({ ...shape('shape:1', 'page:a'), meta: {} }, ann).meta.ownerId).toBe('ann')
	})

	it('leaves your own shapes, other records, and anonymous sessions alone', () => {
		const own = shape('shape:1', 'page:a', 'ann')
		expect(stamp(own, ann)).toBe(own)
		const p = page('page:a')
		expect(stamp(p, ann)).toBe(p)
		const theirs = shape('shape:1', 'page:a', 'bob')
		expect(stamp(theirs, { userId: null, abilities: [] })).toBe(theirs)
	})
})

describe('ownShapesOnly detach', () => {
	const rule = ownShapesOnly<Rec>()
	const target = shape('shape:t', 'page:a', 'ann')
	const arrow = shape('shape:arrow', 'page:a', 'bob', {
		start: { x: 0, y: 0 },
		end: { x: 100, y: 0 },
		bend: 0,
		color: 'black',
	})
	arrow.type = 'arrow'
	const binding = rec({
		id: 'binding:1',
		typeName: 'binding',
		type: 'arrow',
		fromId: 'shape:arrow',
		toId: 'shape:t',
		meta: {},
		props: { terminal: 'end' },
	})

	/** Ann deletes her shape and the binding to it, and changes bob's arrow to `props`. */
	function detach(props: object) {
		const next = { ...arrow, props: { ...arrow.props, ...props } }
		const tx = createTransaction<Rec>({
			access: { userId: 'ann', abilities: ['edit'] },
			intent: null,
			diff: {
				added: {},
				updated: { [arrow.id]: [arrow, next] },
				removed: { [target.id]: target, [binding.id]: binding },
			} as any,
			after: reader([next]),
		})
		return rule(tx)
	}

	it('lets the cut end move and the bend change', () => {
		expect(detach({ end: { x: 50, y: 50 }, bend: 10 })).toBeUndefined()
	})

	it('does not let the other end move', () => {
		expect(detach({ start: { x: -500, y: -500 } })).toBe('You can only change your own shapes.')
	})

	it('does not let anything else change', () => {
		expect(detach({ end: { x: 50, y: 50 }, color: 'red' })).toBe(
			'You can only change your own shapes.'
		)
	})
})
