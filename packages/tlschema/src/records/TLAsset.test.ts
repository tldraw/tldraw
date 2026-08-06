import { RecordId, UnknownRecord } from '@tldraw/store'
import { describe, expect, it } from 'vitest'
import { AssetRecordType, isAsset, TLAsset } from './TLAsset'

const asset = AssetRecordType.create({
	type: 'bookmark',
	props: { title: 'tldraw', description: '', image: '', favicon: '', src: 'https://tldraw.com' },
})

function record(typeName: string, id: string): UnknownRecord {
	return { id: id as RecordId<UnknownRecord>, typeName }
}

describe('isAsset', () => {
	it('returns true for an asset record', () => {
		expect(isAsset(asset)).toBe(true)
	})

	it('returns false for records of other types', () => {
		expect(isAsset(record('shape', 'shape:a'))).toBe(false)
		expect(isAsset(record('page', 'page:a'))).toBe(false)
		expect(isAsset(record('binding', 'binding:a'))).toBe(false)
	})

	it('returns false for undefined', () => {
		expect(isAsset(undefined)).toBe(false)
		expect(isAsset()).toBe(false)
	})

	it('narrows the record type', () => {
		const rec: UnknownRecord = asset
		if (isAsset(rec)) {
			// this only compiles if `rec` narrowed to TLAsset
			const narrowed: TLAsset = rec
			expect(narrowed.type).toBe('bookmark')
		} else {
			throw new Error('expected record to be an asset')
		}
	})

	it('filters assets out of a mixed list of records', () => {
		const records: UnknownRecord[] = [asset, record('shape', 'shape:a')]
		expect(records.filter(isAsset)).toEqual([asset])
	})
})
