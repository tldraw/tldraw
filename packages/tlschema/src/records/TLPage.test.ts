import { describe, expect, it } from 'vitest'
import { isPageId, pageMigrations, PageRecordType, pageVersions, TLPageId } from './TLPage'

describe('pageMigrations', () => {
	it('should apply AddMeta migration correctly', () => {
		const addMetaMigration = pageMigrations.sequence.find((m) => m.id === pageVersions.AddMeta)!

		const oldRecord: any = {
			typeName: 'page',
			id: 'page:test',
			name: 'Test Page',
			index: 'a1',
		}

		addMetaMigration.up(oldRecord)
		expect(oldRecord.meta).toEqual({})
	})
})

describe('PageRecordType', () => {
	it('should create page records with defaults', () => {
		const page = PageRecordType.create({
			id: 'page:test' as TLPageId,
			name: 'Test Page',
			index: 'a1' as any,
		})

		expect(page.meta).toEqual({})
	})
})

describe('isPageId', () => {
	it('should return true for valid page IDs', () => {
		expect(isPageId('page:main')).toBe(true)
		expect(isPageId('page:page1')).toBe(true)
	})

	it('should return false for invalid page IDs', () => {
		expect(isPageId('shape:main')).toBe(false)
		expect(isPageId('invalid')).toBe(false)
		expect(isPageId('')).toBe(false)
	})
})
