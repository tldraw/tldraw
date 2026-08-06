import { RecordId, UnknownRecord } from '@tldraw/store'
import { IndexKey } from '@tldraw/utils'
import { describe, expect, it } from 'vitest'
import { isPage, PageRecordType, TLPage } from './TLPage'

const page = PageRecordType.create({ name: 'Page 1', index: 'a1' as IndexKey })

function record(typeName: string, id: string): UnknownRecord {
	return { id: id as RecordId<UnknownRecord>, typeName }
}

describe('isPage', () => {
	it('returns true for a page record', () => {
		expect(isPage(page)).toBe(true)
	})

	it('returns false for records of other types', () => {
		expect(isPage(record('shape', 'shape:a'))).toBe(false)
		expect(isPage(record('binding', 'binding:a'))).toBe(false)
		expect(isPage(record('asset', 'asset:a'))).toBe(false)
	})

	it('returns false for undefined', () => {
		expect(isPage(undefined)).toBe(false)
		expect(isPage()).toBe(false)
	})

	it('narrows the record type', () => {
		const record: UnknownRecord = page
		if (isPage(record)) {
			// this only compiles if `record` narrowed to TLPage
			const narrowed: TLPage = record
			expect(narrowed.name).toBe('Page 1')
		} else {
			throw new Error('expected record to be a page')
		}
	})

	it('filters pages out of a mixed list of records', () => {
		const records: UnknownRecord[] = [page, record('shape', 'shape:a')]
		expect(records.filter(isPage)).toEqual([page])
	})
})
