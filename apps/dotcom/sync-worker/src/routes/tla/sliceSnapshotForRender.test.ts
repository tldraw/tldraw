import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { RoomSnapshot } from '@tldraw/sync-core'
import { AssetRecordType, TLRecord, TLShape, createTLSchema, isShape } from '@tldraw/tlschema'
import { getHashForString } from '@tldraw/utils'
import { describe, expect, it } from 'vitest'
import { getShapesOnPage } from './boardTools'
import { sliceSnapshotForRender } from './sliceSnapshotForRender'

// Stand-ins carry only the fields the slice reads.
const doc = { id: 'document:document', typeName: 'document' } as unknown as TLRecord
const page = (id: string) => ({ id, typeName: 'page', name: id }) as unknown as TLRecord
const shape = (id: string, parentId: string, props: object = {}) =>
	({ id, typeName: 'shape', type: 'geo', parentId, props, meta: {} }) as unknown as TLRecord
const binding = (id: string, fromId: string, toId: string) =>
	({ id, typeName: 'binding', type: 'arrow', fromId, toId }) as unknown as TLRecord
const asset = (id: string) => ({ id, typeName: 'asset', type: 'image' }) as unknown as TLRecord

const ids = (records: TLRecord[] | null) => new Set(records?.map((r) => r.id))

describe('sliceSnapshotForRender', () => {
	it('returns the records untouched when nothing narrows them', () => {
		const records = [doc, page('page:a'), shape('shape:1', 'page:a')]
		expect(sliceSnapshotForRender(records, {})).toBe(records)
	})

	it('drops other pages and their shapes', () => {
		const records = [
			doc,
			page('page:a'),
			page('page:b'),
			shape('shape:onA', 'page:a'),
			shape('shape:onB', 'page:b'),
		]

		expect(ids(sliceSnapshotForRender(records, { pageId: 'page:a' }))).toEqual(
			new Set(['document:document', 'page:a', 'shape:onA'])
		)
	})

	it('keeps the descendants of a requested frame', () => {
		const records = [
			doc,
			page('page:a'),
			shape('shape:frame', 'page:a'),
			shape('shape:child', 'shape:frame'),
			shape('shape:grandchild', 'shape:child'),
			shape('shape:outside', 'page:a'),
		]

		const sliced = sliceSnapshotForRender(records, {
			pageId: 'page:a',
			shapeIds: ['shape:frame'],
		})

		expect(ids(sliced)).toEqual(
			new Set(['document:document', 'page:a', 'shape:frame', 'shape:child', 'shape:grandchild'])
		)
	})

	it('keeps the ancestors of a requested shape, since coordinates are parent-relative', () => {
		const records = [
			doc,
			page('page:a'),
			shape('shape:frame', 'page:a'),
			shape('shape:inner', 'shape:frame'),
		]

		const sliced = sliceSnapshotForRender(records, {
			pageId: 'page:a',
			shapeIds: ['shape:inner'],
		})

		expect(ids(sliced)).toContain('shape:frame')
	})

	it('keeps a binding when both ends survive', () => {
		const records = [
			doc,
			page('page:a'),
			shape('shape:from', 'page:a'),
			shape('shape:to', 'page:a'),
			binding('binding:1', 'shape:from', 'shape:to'),
		]

		const sliced = sliceSnapshotForRender(records, { pageId: 'page:a' })
		expect(ids(sliced)).toContain('binding:1')
	})

	it('keeps a binding to a shape outside the request, and the shape it points at', () => {
		const records = [
			doc,
			page('page:a'),
			shape('shape:from', 'page:a'),
			shape('shape:frame', 'page:a'),
			shape('shape:to', 'shape:frame'),
			shape('shape:unrelated', 'page:a'),
			binding('binding:1', 'shape:from', 'shape:to'),
		]

		const sliced = sliceSnapshotForRender(records, {
			pageId: 'page:a',
			shapeIds: ['shape:from'],
		})

		expect(ids(sliced)).toEqual(
			new Set(['document:document', 'page:a', 'shape:from', 'shape:frame', 'shape:to', 'binding:1'])
		)
	})

	it('does not chase bindings between two neighbours', () => {
		const records = [
			doc,
			page('page:a'),
			shape('shape:from', 'page:a'),
			shape('shape:to', 'page:a'),
			shape('shape:far', 'page:a'),
			binding('binding:1', 'shape:from', 'shape:to'),
			binding('binding:2', 'shape:to', 'shape:far'),
		]

		const sliced = sliceSnapshotForRender(records, {
			pageId: 'page:a',
			shapeIds: ['shape:from'],
		})

		expect(ids(sliced)).not.toContain('binding:2')
		expect(ids(sliced)).not.toContain('shape:far')
	})

	it('keeps the asset an image shape references', () => {
		const records = [
			doc,
			page('page:a'),
			shape('shape:image', 'page:a', { assetId: 'asset:pic' }),
			asset('asset:pic'),
			asset('asset:unused'),
		]

		const sliced = sliceSnapshotForRender(records, { pageId: 'page:a' })
		expect(ids(sliced)).toContain('asset:pic')
		expect(ids(sliced)).not.toContain('asset:unused')
	})

	it('finds an asset referenced from somewhere no allowlist would look', () => {
		const records = [
			doc,
			page('page:a'),
			// A custom/embed shape holding its asset id somewhere other than props.assetId.
			shape('shape:custom', 'page:a', { layers: [{ fill: { source: 'asset:deep' } }] }),
			asset('asset:deep'),
		]

		expect(ids(sliceSnapshotForRender(records, { pageId: 'page:a' }))).toContain('asset:deep')
	})

	it('refuses rather than rendering a cluster it cannot assemble', () => {
		const records = [doc, page('page:a'), shape('shape:1', 'page:a')]

		expect(
			sliceSnapshotForRender(records, { pageId: 'page:a', shapeIds: ['shape:missing'] })
		).toBeNull()
	})

	it('refuses when a requested shape lives on a different page than the one being drawn', () => {
		const records = [doc, page('page:a'), page('page:b'), shape('shape:onB', 'page:b')]

		// The shape survives but its parent page does not, so the slice is not closed. Refusing here
		// sends the whole board instead of drawing a shape with no page to sit on.
		expect(
			sliceSnapshotForRender(records, { pageId: 'page:a', shapeIds: ['shape:onB'] })
		).toBeNull()
	})

	// Regression: an allowlist filter dropped `user` records and silently lost note attribution.
	it('keeps record types the slice has no rule for, like the user records behind note attribution', () => {
		const records = [
			doc,
			page('page:a'),
			shape('shape:note', 'page:a', { textLastEditedBy: 'someone' }),
			{ id: 'user:someone', typeName: 'user', name: 'Someone' } as unknown as TLRecord,
		]

		expect(ids(sliceSnapshotForRender(records, { pageId: 'page:a' }))).toContain('user:someone')
	})

	it('keeps the asset a bookmark resolves through its url hash', () => {
		const url = 'https://example.com'
		const derived = AssetRecordType.createId(getHashForString(url))
		const records = [
			doc,
			page('page:a'),
			{
				id: 'shape:bookmark',
				typeName: 'shape',
				type: 'bookmark',
				parentId: 'page:a',
				props: { assetId: null, url },
			} as unknown as TLRecord,
			{ id: derived, typeName: 'asset', type: 'bookmark' } as unknown as TLRecord,
			asset('asset:unused'),
		]

		const sliced = sliceSnapshotForRender(records, { pageId: 'page:a' })
		expect(ids(sliced)).toContain(derived)
		expect(ids(sliced)).not.toContain('asset:unused')
	})

	it('leaves an already-dangling reference alone, since sending everything renders it the same', () => {
		const records = [doc, page('page:a'), shape('shape:image', 'page:a', { assetId: 'asset:gone' })]

		expect(sliceSnapshotForRender(records, { pageId: 'page:a' })).not.toBeNull()
	})
})

// The committed welcome board: real records at the current schema — groups, images, text, draw
// strokes and three image assets nothing on the page uses.
const WELCOME = JSON.parse(
	readFileSync(
		fileURLToPath(new URL('../../../assets/welcome-snapshot.json', import.meta.url)),
		'utf8'
	)
) as RoomSnapshot
const schema = createTLSchema()

// A copy of the welcome page's shapes and assets under fresh ids on a page of its own, so a board
// built from several copies has pages whose content is real and whose ids never collide.
function copyWelcomePage(suffix: string): TLRecord[] {
	const records = WELCOME.documents
		.map((d) => d.state as TLRecord)
		.filter((r) => r.typeName !== 'document')
	return JSON.parse(
		JSON.stringify(records)
			.replace(/"page:page"/g, `"page:${suffix}"`)
			.replace(/"(shape|asset):([^"]+)"/g, `"$1:$2_${suffix}"`)
	)
}

function makeBoard(pageCount: number): TLRecord[] {
	const doc = WELCOME.documents.find((d) => d.state.typeName === 'document')!.state as TLRecord
	const records = [doc]
	for (let i = 0; i < pageCount; i++) records.push(...copyWelcomePage(`p${i}`))
	return records
}

function asSnapshot(records: TLRecord[]): RoomSnapshot {
	return { ...WELCOME, documents: records.map((state) => ({ state, lastChangedClock: 0 })) }
}

function descendantsOf(records: TLRecord[], rootIds: string[]) {
	const out = new Set(rootIds)
	let grew = true
	while (grew) {
		grew = false
		for (const r of records) {
			if (isShape(r) && out.has(r.parentId) && !out.has(r.id)) {
				out.add(r.id)
				grew = true
			}
		}
	}
	return out
}

function ancestorsOf(records: TLRecord[], id: string) {
	const byId = new Map<string, TLRecord>(records.map((r) => [r.id, r]))
	const out = new Set<string>()
	let current = byId.get(id)
	while (current && isShape(current) && isShape(byId.get(current.parentId))) {
		out.add(current.parentId)
		current = byId.get(current.parentId)
	}
	return out
}

// The properties the render page depends on, checked against oracles that share no code with the
// slice: page membership from boardTools, descendants and ancestors by brute force, assets straight
// off the image shapes' props.
function expectFaithfulSlice(
	records: TLRecord[],
	sliced: TLRecord[] | null,
	expectedShapeIds: Set<string>
) {
	expect(sliced).not.toBeNull()
	const out = sliced!
	const outIds = new Set(out.map((r) => r.id))

	// A subsequence in source order, so the store sees records in the order persistence wrote them.
	expect(out.map((r) => r.id)).toEqual(records.filter((r) => outIds.has(r.id)).map((r) => r.id))

	expect(new Set(out.filter(isShape).map((r) => r.id))).toEqual(expectedShapeIds)

	const expectedAssets = new Set(
		out
			.filter(isShape)
			.map((s) => (s.props as { assetId?: string | null }).assetId)
			.filter((id): id is string => !!id)
	)
	expect(new Set(out.filter((r) => r.typeName === 'asset').map((r) => r.id))).toEqual(
		expectedAssets
	)

	for (const record of out) {
		// Every record still validates, and every shape still has its parent.
		expect(() => schema.types[record.typeName].validate(record)).not.toThrow()
		if (isShape(record)) expect(outIds.has(record.parentId)).toBe(true)
	}
	expect(out.filter((r) => r.typeName === 'page')).toHaveLength(1)
	expect(out.find((r) => r.typeName === 'document')).toBeDefined()
}

describe('sliceSnapshotForRender on a real board', () => {
	const records = makeBoard(3)
	const snapshot = asSnapshot(records)
	const pageIds = records.filter((r) => r.typeName === 'page').map((r) => r.id)

	it.each(pageIds)('slices %s to exactly its own shapes and the assets they use', (pageId) => {
		const expected = new Set(getShapesOnPage(snapshot, pageId).map((s) => s.id))
		expect(expected.size).toBeGreaterThan(0)
		expectFaithfulSlice(records, sliceSnapshotForRender(records, { pageId }), expected)
	})

	it('drops the assets nothing on the page uses', () => {
		const sliced = sliceSnapshotForRender(records, { pageId: 'page:p0' })!
		const onPage = records.filter((r) => r.typeName === 'asset' && r.id.endsWith('_p0'))
		expect(sliced.filter((r) => r.typeName === 'asset').length).toBeLessThan(onPage.length)
	})

	it('slices every group on a page to the group and its contents', () => {
		const groups = records.filter(
			(r): r is TLShape => isShape(r) && r.type === 'group' && r.id.endsWith('_p1')
		)
		expect(groups.length).toBeGreaterThan(0)
		for (const group of groups) {
			const sliced = sliceSnapshotForRender(records, { pageId: 'page:p1', shapeIds: [group.id] })
			const expected = descendantsOf(records, [group.id])
			for (const id of ancestorsOf(records, group.id)) expected.add(id)
			expectFaithfulSlice(records, sliced, expected)
		}
	})

	it('keeps the groups around a shape requested from inside them', () => {
		const nested = records.filter(
			(r): r is TLShape => isShape(r) && r.parentId.startsWith('shape:') && r.id.endsWith('_p2')
		)
		expect(nested.length).toBeGreaterThan(0)
		for (const shape of nested) {
			const sliced = sliceSnapshotForRender(records, { pageId: 'page:p2', shapeIds: [shape.id] })
			const expected = descendantsOf(records, [shape.id])
			for (const id of ancestorsOf(records, shape.id)) expected.add(id)
			expect(expected.size).toBeGreaterThan(1)
			expectFaithfulSlice(records, sliced, expected)
		}
	})

	it('slices a multi-shape cluster to the union of its members', () => {
		const topLevel = records.filter((r): r is TLShape => isShape(r) && r.parentId === 'page:p0')
		const cluster = topLevel.slice(0, 12).map((s) => s.id)
		const sliced = sliceSnapshotForRender(records, { pageId: 'page:p0', shapeIds: cluster })
		expectFaithfulSlice(records, sliced, descendantsOf(records, cluster))
	})
})

// Arrows from before bindings were records hold their target as `props.start.boundShapeId`, and
// the store's migration turns that into a binding when the render page loads the board. The slice
// runs on the unmigrated records, so it must keep what that migration needs.
describe('sliceSnapshotForRender on a board from before arrow bindings', () => {
	const geo = WELCOME.documents.find((d) => (d.state as TLShape).type === 'geo')!.state as TLShape
	const box = (id: string, parentId: string, x: number) =>
		({ ...structuredClone(geo), id, parentId, x, y: 0, opacity: 1 }) as TLRecord
	const terminal = (boundShapeId: string) => ({
		type: 'binding',
		boundShapeId,
		normalizedAnchor: { x: 0.5, y: 0.5 },
		isExact: false,
		isPrecise: false,
	})
	// Arrow props as they were at arrow version 3, the last before ExtractBindings moved terminals
	// into binding records.
	const legacyArrow = (id: string, parentId: string, from: string, to: string) =>
		({
			id,
			typeName: 'shape',
			type: 'arrow',
			parentId,
			index: 'a9',
			x: 0,
			y: 0,
			rotation: 0,
			isLocked: false,
			opacity: 1,
			meta: {},
			props: {
				dash: 'draw',
				size: 'm',
				fill: 'none',
				color: 'black',
				labelColor: 'black',
				bend: 0,
				start: terminal(from),
				end: terminal(to),
				arrowheadStart: 'none',
				arrowheadEnd: 'arrow',
				text: 'label',
				labelPosition: 0.5,
				font: 'draw',
			},
		}) as unknown as TLRecord

	const doc = WELCOME.documents.find((d) => d.state.typeName === 'document')!.state as TLRecord
	const records: TLRecord[] = [
		doc,
		{ id: 'page:a', typeName: 'page', name: 'A', index: 'a1', meta: {} } as TLRecord,
		{ id: 'page:b', typeName: 'page', name: 'B', index: 'a2', meta: {} } as TLRecord,
		box('shape:box1', 'page:a', 0),
		box('shape:box2', 'page:a', 400),
		legacyArrow('shape:arrow', 'page:a', 'shape:box1', 'shape:box2'),
		box('shape:box3', 'page:b', 0),
		legacyArrow('shape:arrowB', 'page:b', 'shape:box3', 'shape:box3'),
	]
	const legacySchema = structuredClone(schema.serialize())
	legacySchema.sequences['com.tldraw.shape.arrow'] = 3
	delete legacySchema.sequences['com.tldraw.binding.arrow']

	const migrate = (input: TLRecord[]) => {
		const result = schema.migrateStoreSnapshot({
			store: Object.fromEntries(input.map((r) => [r.id, r])),
			schema: legacySchema,
		})
		if (result.type !== 'success') throw new Error(`migration failed: ${result.reason}`)
		return result.value
	}

	it('migrates a sliced page to the same records as the whole board, bindings included', () => {
		const sliced = sliceSnapshotForRender(records, { pageId: 'page:a' })
		expect(sliced).not.toBeNull()

		const fromSlice = Object.values(migrate(sliced!))
		const fromWhole = Object.values(migrate(records))
		for (const record of fromSlice) {
			expect(() => schema.types[record.typeName].validate(record)).not.toThrow()
		}
		// The migration mints binding ids at random, so bindings compare by content and the rest by id.
		const withoutBindingIds = (rs: typeof fromSlice) =>
			rs.map((r) => (r.typeName === 'binding' ? { ...r, id: 'binding' } : r))
		const sliceIds = new Set<string>(sliced!.map((r) => r.id))
		const expected = fromWhole.filter((r) =>
			r.typeName === 'binding' ? sliceIds.has((r as { fromId: string }).fromId) : sliceIds.has(r.id)
		)
		expect(withoutBindingIds(fromSlice)).toEqual(
			expect.arrayContaining(withoutBindingIds(expected))
		)
		expect(fromSlice).toHaveLength(expected.length)
		expect(fromSlice.filter((r) => r.typeName === 'binding')).toHaveLength(2)
	})

	it('sends the whole board for an arrow requested without the shapes it is bound to', () => {
		// The terminals name box1 and box2 by id, so the closure check sees they are missing.
		expect(
			sliceSnapshotForRender(records, { pageId: 'page:a', shapeIds: ['shape:arrow'] })
		).toBeNull()
	})
})

// The route slices on every render, inside the Worker's CPU budget. Boards run up to tens of MB of
// records; this one is ~25 MB across 190 pages, about the largest a render can receive. Measured
// locally at ~5 ms a slice, so the bounds below leave ~50x for slow CI while a quadratic walk
// would still blow through them.
describe('sliceSnapshotForRender performance', () => {
	const records = makeBoard(190)
	const time = (fn: () => unknown) => {
		const start = performance.now()
		fn()
		return performance.now() - start
	}
	// Warm the JIT so the timed runs measure the steady state a busy Worker isolate would see.
	sliceSnapshotForRender(records, { pageId: 'page:p0' })
	JSON.stringify(records)

	it('slices a page out of a 25 MB board well inside the budget', () => {
		expect(JSON.stringify(records).length).toBeGreaterThan(24_000_000)
		for (const pageId of ['page:p0', 'page:p95', 'page:p189']) {
			let sliced: TLRecord[] | null = null
			expect(time(() => (sliced = sliceSnapshotForRender(records, { pageId })))).toBeLessThan(250)
			expect(sliced!.length).toBeLessThan(WELCOME.documents.length)
		}
	})

	it('slices a cluster out of the same board well inside the budget', () => {
		const cluster = records
			.filter((r): r is TLShape => isShape(r) && r.parentId === 'page:p42')
			.slice(0, 20)
			.map((s) => s.id)
		let sliced: TLRecord[] | null = null
		expect(
			time(
				() => (sliced = sliceSnapshotForRender(records, { pageId: 'page:p42', shapeIds: cluster }))
			)
		).toBeLessThan(250)
		expect(sliced).not.toBeNull()
	})

	it('costs the route less than serializing the whole board did', () => {
		// The route used to JSON-encode every record; now it slices first and encodes the slice.
		const whole = Math.min(...[0, 1, 2].map(() => time(() => JSON.stringify(records))))
		const sliced = Math.min(
			...[0, 1, 2].map(() =>
				time(() => JSON.stringify(sliceSnapshotForRender(records, { pageId: 'page:p7' })))
			)
		)
		expect(sliced).toBeLessThan(whole)
	})
})
