import { LibraryRecordType, commentSchemaRecords, createTLSchema, TLRecord } from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import { validateSnapshot } from './validateSnapshot'

const snapshotOf = (records: object[]) =>
	Object.fromEntries(records.map((r: any) => [r.id, r])) as Record<string, TLRecord>

describe('validateSnapshot', () => {
	it('accepts a board library', () => {
		const library = LibraryRecordType.create({ name: 'Wireframes' })
		const result = validateSnapshot({
			schema: createTLSchema().serialize(),
			snapshot: snapshotOf([library]),
		})
		expect(result).toEqual({ ok: true, value: { [library.id]: library } })
	})

	it('rejects a library that fails validation', () => {
		const library = { ...LibraryRecordType.create({ name: 'Wireframes' }), name: ' ' }
		const result = validateSnapshot({
			schema: createTLSchema().serialize(),
			snapshot: snapshotOf([library]),
		})
		expect(result.ok).toBe(false)
	})

	it('rejects a comment, which is never part of a document', () => {
		const comment = { id: 'comment:1', typeName: 'comment' }
		const result = validateSnapshot({
			schema: createTLSchema({ records: commentSchemaRecords }).serialize(),
			snapshot: snapshotOf([comment]),
		})
		expect(result.ok).toBe(false)
	})
})
