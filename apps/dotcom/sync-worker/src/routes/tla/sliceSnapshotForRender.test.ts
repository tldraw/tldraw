import { TLRecord } from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import {
	SnapshotSliceError,
	sliceSnapshotForRender,
	toRenderScriptLiteral,
} from './sliceSnapshotForRender'

// Minimal stand-ins: the slice reads typeName, id, parentId, fromId/toId and scans props for
// references, so nothing here needs to be a valid tldraw record — only to carry those fields.
const doc = { id: 'document:document', typeName: 'document' } as unknown as TLRecord
const page = (id: string) => ({ id, typeName: 'page', name: id }) as unknown as TLRecord
const shape = (id: string, parentId: string, props: object = {}) =>
	({ id, typeName: 'shape', type: 'geo', parentId, props, meta: {} }) as unknown as TLRecord
const binding = (id: string, fromId: string, toId: string) =>
	({ id, typeName: 'binding', type: 'arrow', fromId, toId }) as unknown as TLRecord
const asset = (id: string) => ({ id, typeName: 'asset', type: 'image' }) as unknown as TLRecord

const ids = (records: TLRecord[]) => new Set(records.map((r) => r.id))

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

	it('drops a binding whose other end was not requested, rather than stranding it', () => {
		const records = [
			doc,
			page('page:a'),
			shape('shape:from', 'page:a'),
			shape('shape:to', 'page:a'),
			binding('binding:1', 'shape:from', 'shape:to'),
		]

		const sliced = sliceSnapshotForRender(records, {
			pageId: 'page:a',
			shapeIds: ['shape:from'],
		})

		expect(ids(sliced)).toEqual(new Set(['document:document', 'page:a', 'shape:from']))
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

	it('throws rather than rendering a cluster it cannot assemble', () => {
		const records = [doc, page('page:a'), shape('shape:1', 'page:a')]

		expect(() =>
			sliceSnapshotForRender(records, { pageId: 'page:a', shapeIds: ['shape:missing'] })
		).toThrow(SnapshotSliceError)
	})

	it('throws when a requested shape lives on a different page than the one being drawn', () => {
		const records = [doc, page('page:a'), page('page:b'), shape('shape:onB', 'page:b')]

		// The shape survives but its parent page does not, so the slice is not closed. Failing here
		// sends the render down the pull path instead of drawing a shape with no page to sit on.
		expect(() =>
			sliceSnapshotForRender(records, { pageId: 'page:a', shapeIds: ['shape:onB'] })
		).toThrow(SnapshotSliceError)
	})

	// The regression that proved keep-by-default: a note's attribution rides on a `user` record that
	// the shape references by BARE string (`textLastEditedBy`, no `user:` prefix), so neither the
	// reference walk nor the closure check can see the linkage. An enumerate-what-to-keep filter
	// dropped it silently and push lost the attribution line that pull renders.
	it('keeps record types the slice has no rule for, like the user records behind note attribution', () => {
		const records = [
			doc,
			page('page:a'),
			shape('shape:note', 'page:a', { textLastEditedBy: 'someone' }),
			{ id: 'user:someone', typeName: 'user', name: 'Someone' } as unknown as TLRecord,
		]

		expect(ids(sliceSnapshotForRender(records, { pageId: 'page:a' }))).toContain('user:someone')
	})

	// Comments anchor to shapes by id, so keeping them would fail the closure check whenever their
	// shape is outside the slice — and they draw nothing: editor.toImage exports shapes only and the
	// render page mounts no comment UI. Dropping them is pixel-identical to the pull path.
	it('drops comment records without tripping the closure check on their anchors', () => {
		const records = [
			doc,
			page('page:a'),
			page('page:b'),
			shape('shape:onB', 'page:b'),
			{
				id: 'comment-thread:t1',
				typeName: 'comment-thread',
				pageId: 'page:b',
				anchor: { type: 'shape', shapeId: 'shape:onB' },
			} as unknown as TLRecord,
			{
				id: 'comment:c1',
				typeName: 'comment',
				threadId: 'comment-thread:t1',
			} as unknown as TLRecord,
		]

		const sliced = sliceSnapshotForRender(records, { pageId: 'page:a' })
		expect(ids(sliced)).not.toContain('comment-thread:t1')
		expect(ids(sliced)).not.toContain('comment:c1')
	})

	it('leaves an already-dangling reference alone, since sending everything renders it the same', () => {
		const records = [doc, page('page:a'), shape('shape:image', 'page:a', { assetId: 'asset:gone' })]

		expect(() => sliceSnapshotForRender(records, { pageId: 'page:a' })).not.toThrow()
	})
})

describe('toRenderScriptLiteral', () => {
	it('escapes a closing script tag hidden in board text', () => {
		const literal = toRenderScriptLiteral({ text: 'hello </script> world' })

		expect(literal).not.toContain('</script>')
		expect(JSON.parse(literal.replace(/\\u003c/g, '<'))).toEqual({
			text: 'hello </script> world',
		})
	})

	it('escapes the line separators that are legal in JSON but not in JS source', () => {
		const literal = toRenderScriptLiteral({ text: 'a\u2028b\u2029c' })

		expect(literal).not.toMatch(/[\u2028\u2029]/)
		expect(literal).toContain('\\u2028')
		expect(literal).toContain('\\u2029')
	})

	it('round-trips through evaluation the way the injected script will', () => {
		const payload = { records: [{ id: 'shape:1', text: '</script> "quoted" \\ back' }] }

		const value = new Function(`return ${toRenderScriptLiteral(payload)}`)()
		expect(value).toEqual(payload)
	})
})
