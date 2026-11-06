import type { UnknownRecord } from '@tldraw/store'
import { PageRecordType, TLPageId } from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import { getOwningPage } from './page-scope'

// Only the fields the walk reads: `typeName`, `parentId`, `fromId`.
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

	it('a binding lives on the page of its fromId shape', () => {
		expect(getOwningPage(reader(pageA, arrow), binding)).toEqual({ page: pageA })
	})

	it('a binding whose fromId is missing is dangling', () => {
		expect(getOwningPage(reader(pageA), binding)).toEqual({ page: null, reason: 'dangling' })
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
