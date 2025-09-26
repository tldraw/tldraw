import { describe, expect, it } from 'vitest'
import {
	isPageId,
	pageIdValidator,
	pageMigrations,
	PageRecordType,
	pageValidator,
	pageVersions,
	TLPageId,
} from './TLPage'

describe('pageIdValidator', () => {
	it('should validate correct page IDs', () => {
		expect(() => pageIdValidator.validate('page:main')).not.toThrow()
		expect(() => pageIdValidator.validate('page:page1')).not.toThrow()
	})

	it('should reject invalid page IDs', () => {
		expect(() => pageIdValidator.validate('invalid')).toThrow()
		expect(() => pageIdValidator.validate('shape:page1')).toThrow()
		expect(() => pageIdValidator.validate('')).toThrow()
	})
})

describe('pageValidator', () => {
	it('should validate valid page records', () => {
		const validPage = {
			typeName: 'page',
			id: 'page:test' as TLPageId,
			name: 'Test Page',
			index: 'a1' as any,
			meta: {},
		}

		expect(() => pageValidator.validate(validPage)).not.toThrow()
	})

	it('should reject pages with invalid typeName', () => {
		const invalidPage = {
			typeName: 'not-page',
			id: 'page:test' as TLPageId,
			name: 'Test',
			index: 'a1' as any,
			meta: {},
		}

		expect(() => pageValidator.validate(invalidPage)).toThrow()
	})

	it('should reject pages with missing required fields', () => {
		const incompletePages = [
			{
				typeName: 'page',
				id: 'page:test' as TLPageId,
				// missing name, index, meta
			},
			{
				typeName: 'page',
				id: 'page:test' as TLPageId,
				name: 'Test',
				// missing index, meta
			},
		]

		incompletePages.forEach((page) => {
			expect(() => pageValidator.validate(page)).toThrow()
		})
	})
})

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
