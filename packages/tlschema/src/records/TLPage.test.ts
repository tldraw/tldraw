import { describe, expect, it } from 'vitest'
import {
	isPageId,
	pageIdValidator,
	pageMigrations,
	PageRecordType,
	pageValidator,
	pageVersions,
	TLPage,
	TLPageId,
} from './TLPage'

describe('TLPage', () => {
	it('should define the page interface correctly', () => {
		const page: TLPage = {
			id: 'page:page1' as TLPageId,
			typeName: 'page',
			name: 'Page 1',
			index: 'a1' as any,
			meta: { description: 'Main design page' },
		}

		expect(page.id).toBe('page:page1')
		expect(page.typeName).toBe('page')
		expect(page.name).toBe('Page 1')
		expect(page.index).toBe('a1')
		expect(page.meta).toEqual({ description: 'Main design page' })
	})
})

describe('TLPageId', () => {
	it('should be a branded type', () => {
		const pageId: TLPageId = 'page:main' as TLPageId
		expect(typeof pageId).toBe('string')
		expect(pageId.startsWith('page:')).toBe(true)
	})
})

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
		const validated = pageValidator.validate(validPage)
		expect(validated).toEqual(validPage)
	})

	it('should validate pages with complex meta', () => {
		const pageWithMeta = {
			typeName: 'page',
			id: 'page:test' as TLPageId,
			name: 'Complex Page',
			index: 'a2' as any,
			meta: {
				description: 'A detailed page',
				category: 'design',
				tags: ['wireframe', 'mockup'],
				settings: { locked: false, visible: true },
			},
		}

		expect(() => pageValidator.validate(pageWithMeta)).not.toThrow()
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

	it('should reject pages with invalid id format', () => {
		const invalidPage = {
			typeName: 'page',
			id: 'not-a-page-id' as TLPageId,
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

	it('should handle edge case values', () => {
		const edgeCasePage = {
			typeName: 'page',
			id: 'page:edge' as TLPageId,
			name: '',
			index: 'a0' as any,
			meta: {},
		}

		expect(() => pageValidator.validate(edgeCasePage)).not.toThrow()
	})
})

describe('pageVersions', () => {
	it('should have correct version structure', () => {
		expect(pageVersions).toHaveProperty('AddMeta')
		expect(pageVersions.AddMeta).toBe('com.tldraw.page/1')
	})

	it('should be consistent with migration sequence', () => {
		expect(typeof pageVersions.AddMeta).toBe('string')
		expect(pageVersions.AddMeta).toMatch(/^com\.tldraw\.page\/\d+$/)
	})
})

describe('pageMigrations', () => {
	it('should have correct migration configuration', () => {
		expect(pageMigrations.sequenceId).toBe('com.tldraw.page')
		// expect(pageMigrations.recordType).toBe('page') // Property doesn't exist on MigrationSequence
		expect(Array.isArray(pageMigrations.sequence)).toBe(true)
		expect(pageMigrations.sequence).toHaveLength(1)
	})

	it('should include AddMeta migration', () => {
		const addMetaMigration = pageMigrations.sequence.find((m) => m.id === pageVersions.AddMeta)
		expect(addMetaMigration).toBeDefined()
		expect(typeof addMetaMigration?.up).toBe('function')
	})

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

	it('should preserve existing properties during AddMeta migration', () => {
		const addMetaMigration = pageMigrations.sequence.find((m) => m.id === pageVersions.AddMeta)!

		const oldRecord: any = {
			typeName: 'page',
			id: 'page:test',
			name: 'Preserved Page',
			index: 'b2',
			customProp: 'should-remain',
		}

		addMetaMigration.up(oldRecord)
		expect(oldRecord.meta).toEqual({})
		expect(oldRecord.name).toBe('Preserved Page')
		expect(oldRecord.index).toBe('b2')
		expect(oldRecord.customProp).toBe('should-remain')
	})
})

describe('PageRecordType', () => {
	it('should create page records with defaults', () => {
		const page = PageRecordType.create({
			id: 'page:test' as TLPageId,
			name: 'Test Page',
			index: 'a1' as any,
		})

		expect(page.id).toBe('page:test')
		expect(page.typeName).toBe('page')
		expect(page.name).toBe('Test Page')
		expect(page.index).toBe('a1')
		expect(page.meta).toEqual({})
	})

	it('should create page records with custom meta', () => {
		const page = PageRecordType.create({
			id: 'page:custom' as TLPageId,
			name: 'Custom Page',
			index: 'z9' as any,
			meta: { custom: 'metadata', priority: 'high' },
		})

		expect(page.meta).toEqual({ custom: 'metadata', priority: 'high' })
	})

	it('should have correct configuration', () => {
		expect(PageRecordType.typeName).toBe('page')
		expect(PageRecordType.scope).toBe('document')
	})

	it('should validate created records', () => {
		const page = PageRecordType.create({
			id: 'page:validated' as TLPageId,
			name: 'Validated Page',
			index: 'a3' as any,
		})

		expect(() => pageValidator.validate(page)).not.toThrow()
	})

	it('should create unique IDs', () => {
		const id1 = PageRecordType.createId()
		const id2 = PageRecordType.createId()
		expect(id1).not.toBe(id2)
		expect(id1.startsWith('page:')).toBe(true)
		expect(id2.startsWith('page:')).toBe(true)
	})
})

describe('isPageId', () => {
	it('should return true for valid page IDs', () => {
		expect(isPageId('page:main')).toBe(true)
		expect(isPageId('page:page1')).toBe(true)
		expect(isPageId('page:123')).toBe(true)
	})

	it('should return false for invalid page IDs', () => {
		expect(isPageId('shape:main')).toBe(false)
		expect(isPageId('invalid')).toBe(false)
		expect(isPageId('page')).toBe(false)
		expect(isPageId('')).toBe(false)
	})

	it('should return false for null/undefined', () => {
		expect(isPageId(null as any)).toBe(false)
		expect(isPageId(undefined as any)).toBe(false)
	})

	it('should work as type guard', () => {
		const ids = ['page:main', 'shape:rect', 'page:page1', 'invalid']
		const pageIds = ids.filter(isPageId)

		expect(pageIds).toEqual(['page:main', 'page:page1'])
		// TypeScript should infer pageIds as TLPageId[]
		expect(pageIds[0].startsWith('page:')).toBe(true)
	})
})

describe('TLPage Integration', () => {
	it('should work with typical page operations', () => {
		// Create initial page
		const initialPage = PageRecordType.create({
			id: 'page:main' as TLPageId,
			name: 'Main Page',
			index: 'a1' as any,
		})

		// Update page properties
		const updatedPage: TLPage = {
			...initialPage,
			name: 'Updated Main Page',
			meta: { lastModified: Date.now(), author: 'user123' },
		}

		expect(updatedPage.name).toBe('Updated Main Page')
		expect(updatedPage.meta.lastModified).toBeDefined()
		expect(updatedPage.meta.author).toBe('user123')
		expect(() => pageValidator.validate(updatedPage)).not.toThrow()
	})

	it('should support complex page structures', () => {
		const page = PageRecordType.create({
			id: 'page:complex' as TLPageId,
			name: 'Complex Layout',
			index: 'a4' as any,
			meta: {
				layout: { type: 'grid', columns: 3, rows: 2 },
				permissions: { canEdit: true, canDelete: false, viewers: ['user1', 'user2'] },
				history: [
					{ action: 'created', timestamp: Date.now() - 1000, user: 'creator' },
					{ action: 'renamed', timestamp: Date.now() - 500, user: 'editor' },
				],
				tags: ['wireframe', 'responsive', 'mobile-first'],
			},
		})

		expect((page.meta.layout as any)?.type).toBe('grid')
		expect((page.meta.permissions as any)?.canEdit).toBe(true)
		expect(page.meta.history).toHaveLength(2)
		expect(page.meta.tags).toContain('wireframe')
		expect(() => pageValidator.validate(page)).not.toThrow()
	})

	it('should handle page ordering scenarios', () => {
		const pages = [
			PageRecordType.create({
				id: 'page:first' as TLPageId,
				name: 'First Page',
				index: 'a1' as any,
			}),
			PageRecordType.create({
				id: 'page:second' as TLPageId,
				name: 'Second Page',
				index: 'a2' as any,
			}),
			PageRecordType.create({
				id: 'page:third' as TLPageId,
				name: 'Third Page',
				index: 'a3' as any,
			}),
		]

		// Verify ordering by index
		const sortedPages = pages.sort((a, b) => a.index.localeCompare(b.index))
		expect(sortedPages[0].name).toBe('First Page')
		expect(sortedPages[1].name).toBe('Second Page')
		expect(sortedPages[2].name).toBe('Third Page')

		// All pages should be valid
		pages.forEach((page) => {
			expect(() => pageValidator.validate(page)).not.toThrow()
		})
	})
})
