import { AssetRecordType, TLRecord } from '@tldraw/tlschema'
import { getHashForString } from '@tldraw/utils'
import { describe, expect, it } from 'vitest'
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
