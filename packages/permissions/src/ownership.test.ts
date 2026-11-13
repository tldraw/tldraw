import type { UnknownRecord } from '@tldraw/store'
import { PageRecordType, TLPageId } from '@tldraw/tlschema'
import { getOwningAncestor, getOwningPage } from './ownership'

// Only the fields the walk reads: `typeName`, `parentId`, `fromId`, `toId`.
const rec = (r: object) => r as unknown as UnknownRecord
const pageA = PageRecordType.create({ id: 'page:a' as TLPageId, name: 'A', index: 'a1' as any })
const frame = rec({ id: 'shape:frame', typeName: 'shape', parentId: 'page:a' })
const group = rec({ id: 'shape:group', typeName: 'shape', parentId: 'shape:frame' })
const note = rec({ id: 'shape:note', typeName: 'shape', parentId: 'shape:group' })
const orphan = rec({ id: 'shape:orphan', typeName: 'shape', parentId: 'shape:gone' })
const arrow = rec({ id: 'shape:arrow', typeName: 'shape', parentId: 'page:a' })
const binding = rec({
	id: 'binding:b',
	typeName: 'binding',
	fromId: 'shape:arrow',
	toId: 'shape:note',
})
const document = rec({ id: 'document:document', typeName: 'document' })

function reader(...records: UnknownRecord[]) {
	const map = new Map<string, UnknownRecord>(records.map((r) => [r.id, r]))
	return (id: string) => map.get(id)
}

describe('getOwningPage', () => {
	it('a page is its own owning page', () => {
		expect(getOwningPage(reader(), pageA)).toEqual({ page: pageA })
	})

	it('a top-level shape resolves to its page', () => {
		expect(getOwningPage(reader(pageA), frame)).toEqual({ page: pageA })
	})

	it('a nested shape walks frames and groups up to the page', () => {
		expect(getOwningPage(reader(pageA, frame, group), note)).toEqual({ page: pageA })
	})

	it('a shape whose parent chain breaks is dangling', () => {
		expect(getOwningPage(reader(pageA), orphan)).toEqual({ page: null, reason: 'dangling' })
	})

	it('a shape whose page record is missing is dangling', () => {
		expect(getOwningPage(reader(), frame)).toEqual({ page: null, reason: 'dangling' })
	})

	it('a binding lives on the page both its shapes are on', () => {
		expect(getOwningPage(reader(pageA, arrow, frame, group, note), binding)).toEqual({
			page: pageA,
		})
	})

	it('a binding whose shapes are on different pages is split', () => {
		const pageB = PageRecordType.create({ id: 'page:b' as TLPageId, name: 'B', index: 'a2' as any })
		const noteOnB = rec({ id: 'shape:note', typeName: 'shape', parentId: 'page:b' })
		expect(getOwningPage(reader(pageA, pageB, arrow, noteOnB), binding)).toEqual({
			page: null,
			reason: 'split',
		})
	})

	it('a binding with either shape missing is dangling', () => {
		expect(getOwningPage(reader(pageA, note, frame, group), binding)).toEqual({
			page: null,
			reason: 'dangling',
		})
		expect(getOwningPage(reader(pageA, arrow), binding)).toEqual({
			page: null,
			reason: 'dangling',
		})
	})

	it('a binding to something that is not a shape is dangling, even a page', () => {
		const toPage = rec({
			id: 'binding:p',
			typeName: 'binding',
			fromId: 'shape:arrow',
			toId: 'page:a',
		})
		const toDoc = rec({
			id: 'binding:d',
			typeName: 'binding',
			fromId: 'shape:arrow',
			toId: 'document:document',
		})
		const all = reader(pageA, arrow, document)
		expect(getOwningPage(all, toPage)).toEqual({ page: null, reason: 'dangling' })
		expect(getOwningPage(all, toDoc)).toEqual({ page: null, reason: 'dangling' })
	})

	it('a binding whose shape dangles is dangling', () => {
		expect(getOwningPage(reader(pageA, arrow, note), binding)).toEqual({
			page: null,
			reason: 'dangling',
		})
	})

	it('a record with no page is unscoped', () => {
		expect(getOwningPage(reader(pageA), document)).toEqual({ page: null, reason: 'unscoped' })
	})

	it('a parent that is not a shape or page is dangling, not a crash', () => {
		const weird = rec({ id: 'shape:weird', typeName: 'shape', parentId: 'document:document' })
		expect(getOwningPage(reader(document), weird)).toEqual({ page: null, reason: 'dangling' })
	})

	it('a parent cycle is dangling, not a hang', () => {
		const a = rec({ id: 'shape:a', typeName: 'shape', parentId: 'shape:b' })
		const b = rec({ id: 'shape:b', typeName: 'shape', parentId: 'shape:a' })
		expect(getOwningPage(reader(a, b), a)).toEqual({ page: null, reason: 'dangling' })
	})
})

describe('getOwningAncestor', () => {
	const isFrame = (r: UnknownRecord) => r.id === 'shape:frame'
	const outside = rec({ id: 'shape:outside', typeName: 'shape', parentId: 'page:a' })
	const all = reader(pageA, frame, group, note, arrow, outside)

	it('a shape belongs to its frame through nested groups', () => {
		expect(getOwningAncestor(all, note, isFrame)).toEqual({ owner: frame })
	})

	it('the owner is its own owner', () => {
		expect(getOwningAncestor(all, frame, isFrame)).toEqual({ owner: frame })
	})

	it('a shape outside every owner is none, not dangling', () => {
		expect(getOwningAncestor(all, outside, isFrame)).toEqual({ owner: null, reason: 'none' })
		expect(getOwningAncestor(all, pageA, isFrame)).toEqual({ owner: null, reason: 'none' })
	})

	it('a broken chain is dangling even when an owner would be further up', () => {
		const lost = rec({ id: 'shape:lost', typeName: 'shape', parentId: 'shape:gone' })
		expect(getOwningAncestor(all, lost, isFrame)).toEqual({ owner: null, reason: 'dangling' })
	})

	it('a binding inside one owner belongs to it', () => {
		const inside = rec({
			id: 'binding:in',
			typeName: 'binding',
			fromId: 'shape:note',
			toId: 'shape:group',
		})
		expect(getOwningAncestor(all, inside, isFrame)).toEqual({ owner: frame })
	})

	it('a binding with one end inside and one outside is split', () => {
		const across = rec({
			id: 'binding:x',
			typeName: 'binding',
			fromId: 'shape:arrow',
			toId: 'shape:note',
		})
		expect(getOwningAncestor(all, across, isFrame)).toEqual({ owner: null, reason: 'split' })
	})

	it('a binding with both ends outside every owner is none', () => {
		const out = rec({
			id: 'binding:o',
			typeName: 'binding',
			fromId: 'shape:arrow',
			toId: 'shape:outside',
		})
		expect(getOwningAncestor(all, out, isFrame)).toEqual({ owner: null, reason: 'none' })
	})

	it('a record that is not a shape, page or binding is unscoped', () => {
		expect(getOwningAncestor(all, document, isFrame)).toEqual({ owner: null, reason: 'unscoped' })
	})

	it('a parent cycle is dangling, not a hang', () => {
		const a = rec({ id: 'shape:a', typeName: 'shape', parentId: 'shape:b' })
		const b = rec({ id: 'shape:b', typeName: 'shape', parentId: 'shape:a' })
		expect(getOwningAncestor(reader(a, b), a, isFrame)).toEqual({ owner: null, reason: 'dangling' })
	})
})
