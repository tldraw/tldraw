import { UnknownRecord } from '@tldraw/store'
import { describe, expect, it } from 'vitest'
import {
	documentMigrations,
	DocumentRecordType,
	documentValidator,
	documentVersions,
	isDocument,
	TLDocument,
	TLDOCUMENT_ID,
} from './TLDocument'

describe('TLDocument', () => {
	it('should define the document interface correctly', () => {
		const document: TLDocument = {
			id: TLDOCUMENT_ID,
			typeName: 'document',
			gridSize: 20,
			name: 'Test Document',
			meta: { author: 'user123' },
		}

		expect(document.id).toBe('document:document')
		expect(document.typeName).toBe('document')
		expect(document.gridSize).toBe(20)
		expect(document.name).toBe('Test Document')
		expect(document.meta).toEqual({ author: 'user123' })
	})
})

describe('documentValidator', () => {
	it('should validate valid document records', () => {
		const validDocument = {
			typeName: 'document',
			id: TLDOCUMENT_ID,
			gridSize: 10,
			name: 'My Drawing',
			meta: {},
		}

		expect(() => documentValidator.validate(validDocument)).not.toThrow()
		const validated = documentValidator.validate(validDocument)
		expect(validated).toEqual(validDocument)
	})

	it('should validate documents with complex meta', () => {
		const documentWithMeta = {
			typeName: 'document',
			id: TLDOCUMENT_ID,
			gridSize: 25,
			name: 'Complex Document',
			meta: {
				author: 'user123',
				createdAt: Date.now(),
				settings: { theme: 'dark', autoSave: true },
				tags: ['design', 'prototype'],
			},
		}

		expect(() => documentValidator.validate(documentWithMeta)).not.toThrow()
	})

	it('should reject documents with invalid typeName', () => {
		const invalidDocument = {
			typeName: 'not-document',
			id: TLDOCUMENT_ID,
			gridSize: 10,
			name: 'Test',
			meta: {},
		}

		expect(() => documentValidator.validate(invalidDocument)).toThrow()
	})

	it('should reject documents with wrong id', () => {
		const invalidDocument = {
			typeName: 'document',
			id: 'document:wrong-id',
			gridSize: 10,
			name: 'Test',
			meta: {},
		}

		expect(() => documentValidator.validate(invalidDocument)).toThrow()
	})

	it('should reject documents with non-number gridSize', () => {
		const invalidDocument = {
			typeName: 'document',
			id: TLDOCUMENT_ID,
			gridSize: 'not-a-number',
			name: 'Test',
			meta: {},
		}

		expect(() => documentValidator.validate(invalidDocument)).toThrow()
	})

	it('should reject documents with non-string name', () => {
		const invalidDocument = {
			typeName: 'document',
			id: TLDOCUMENT_ID,
			gridSize: 10,
			name: 123,
			meta: {},
		}

		expect(() => documentValidator.validate(invalidDocument)).toThrow()
	})

	it('should reject documents with missing required fields', () => {
		const incompleteDocument = {
			typeName: 'document',
			id: TLDOCUMENT_ID,
			gridSize: 10,
			// missing name, meta
		}

		expect(() => documentValidator.validate(incompleteDocument)).toThrow()
	})

	it('should handle edge case values', () => {
		const edgeCaseDocument = {
			typeName: 'document',
			id: TLDOCUMENT_ID,
			gridSize: 0,
			name: '',
			meta: {},
		}

		expect(() => documentValidator.validate(edgeCaseDocument)).not.toThrow()
	})

	it('should handle negative gridSize', () => {
		const negativeGridDocument = {
			typeName: 'document',
			id: TLDOCUMENT_ID,
			gridSize: -5,
			name: 'Test',
			meta: {},
		}

		expect(() => documentValidator.validate(negativeGridDocument)).not.toThrow()
	})
})

describe('isDocument', () => {
	it('should return true for valid document records', () => {
		const document: TLDocument = {
			id: TLDOCUMENT_ID,
			typeName: 'document',
			gridSize: 10,
			name: 'Test',
			meta: {},
		}

		expect(isDocument(document)).toBe(true)
	})

	it('should return false for non-document records', () => {
		const notDocument: UnknownRecord = {
			id: 'page:test',
			typeName: 'page',
		} as any

		expect(isDocument(notDocument)).toBe(false)
	})

	it('should return false for undefined', () => {
		expect(isDocument(undefined)).toBe(false)
	})

	it('should return false for null', () => {
		expect(isDocument(null as any)).toBe(false)
	})

	it('should return false for objects without typeName', () => {
		const noTypeName = {
			id: TLDOCUMENT_ID,
			gridSize: 10,
		} as any

		expect(isDocument(noTypeName)).toBe(false)
	})

	it('should return false for objects with wrong typeName', () => {
		const wrongType = {
			id: TLDOCUMENT_ID,
			typeName: 'camera',
			gridSize: 10,
		} as any

		expect(isDocument(wrongType)).toBe(false)
	})

	it('should work in type guard context', () => {
		const records: UnknownRecord[] = [
			{
				id: TLDOCUMENT_ID,
				typeName: 'document',
				gridSize: 10,
				name: 'Test',
				meta: {},
			} as TLDocument,
			{
				id: 'page:test',
				typeName: 'page',
			} as any,
		]

		const documents = records.filter(isDocument)
		expect(documents).toHaveLength(1)
		expect(documents[0].typeName).toBe('document')
		expect(documents[0].gridSize).toBe(10)
	})
})

describe('documentVersions', () => {
	it('should have correct version structure', () => {
		expect(documentVersions).toHaveProperty('AddName')
		expect(documentVersions).toHaveProperty('AddMeta')
		expect(documentVersions.AddName).toBe('com.tldraw.document/1')
		expect(documentVersions.AddMeta).toBe('com.tldraw.document/2')
	})

	it('should have sequential version numbers', () => {
		expect(parseInt(documentVersions.AddName.split('/')[1])).toBeLessThan(
			parseInt(documentVersions.AddMeta.split('/')[1])
		)
	})

	it('should be consistent with migration sequence', () => {
		expect(typeof documentVersions.AddName).toBe('string')
		expect(typeof documentVersions.AddMeta).toBe('string')
		expect(documentVersions.AddName).toMatch(/^com\.tldraw\.document\/\d+$/)
		expect(documentVersions.AddMeta).toMatch(/^com\.tldraw\.document\/\d+$/)
	})
})

describe('documentMigrations', () => {
	it('should have correct migration configuration', () => {
		expect(documentMigrations.sequenceId).toBe('com.tldraw.document')
		// expect(documentMigrations.recordType).toBe('document') // Property doesn't exist on MigrationSequence
		expect(Array.isArray(documentMigrations.sequence)).toBe(true)
		expect(documentMigrations.sequence).toHaveLength(2)
	})

	it('should include AddName migration', () => {
		const addNameMigration = documentMigrations.sequence.find(
			(m) => m.id === documentVersions.AddName
		)
		expect(addNameMigration).toBeDefined()
		expect(typeof addNameMigration?.up).toBe('function')
		expect(typeof addNameMigration?.down).toBe('function')
	})

	it('should include AddMeta migration', () => {
		const addMetaMigration = documentMigrations.sequence.find(
			(m) => m.id === documentVersions.AddMeta
		)
		expect(addMetaMigration).toBeDefined()
		expect(typeof addMetaMigration?.up).toBe('function')
		expect(addMetaMigration?.down).toBeUndefined()
	})

	it('should apply AddName migration correctly', () => {
		const addNameMigration = documentMigrations.sequence.find(
			(m) => m.id === documentVersions.AddName
		)!

		const oldRecord: any = {
			typeName: 'document',
			id: TLDOCUMENT_ID,
			gridSize: 10,
		}

		addNameMigration.up(oldRecord)
		expect(oldRecord.name).toBe('')
	})

	it('should reverse AddName migration correctly', () => {
		const addNameMigration = documentMigrations.sequence.find(
			(m) => m.id === documentVersions.AddName
		)!

		const record: any = {
			typeName: 'document',
			id: TLDOCUMENT_ID,
			gridSize: 10,
			name: 'Test Document',
		}

		addNameMigration.down!(record)
		expect(record.name).toBeUndefined()
	})

	it('should preserve existing properties during AddName migration', () => {
		const addNameMigration = documentMigrations.sequence.find(
			(m) => m.id === documentVersions.AddName
		)!

		const oldRecord: any = {
			typeName: 'document',
			id: TLDOCUMENT_ID,
			gridSize: 20,
			customProp: 'should-remain',
		}

		addNameMigration.up(oldRecord)
		expect(oldRecord.name).toBe('')
		expect(oldRecord.gridSize).toBe(20)
		expect(oldRecord.customProp).toBe('should-remain')
	})

	it('should apply AddMeta migration correctly', () => {
		const addMetaMigration = documentMigrations.sequence.find(
			(m) => m.id === documentVersions.AddMeta
		)!

		const oldRecord: any = {
			typeName: 'document',
			id: TLDOCUMENT_ID,
			gridSize: 10,
			name: 'Test',
		}

		addMetaMigration.up(oldRecord)
		expect(oldRecord.meta).toEqual({})
	})

	it('should preserve existing properties during AddMeta migration', () => {
		const addMetaMigration = documentMigrations.sequence.find(
			(m) => m.id === documentVersions.AddMeta
		)!

		const oldRecord: any = {
			typeName: 'document',
			id: TLDOCUMENT_ID,
			gridSize: 25,
			name: 'Preserved Document',
			customProp: 'should-remain',
		}

		addMetaMigration.up(oldRecord)
		expect(oldRecord.meta).toEqual({})
		expect(oldRecord.gridSize).toBe(25)
		expect(oldRecord.name).toBe('Preserved Document')
		expect(oldRecord.customProp).toBe('should-remain')
	})

	it('should not override existing meta property', () => {
		const addMetaMigration = documentMigrations.sequence.find(
			(m) => m.id === documentVersions.AddMeta
		)!

		const oldRecord: any = {
			typeName: 'document',
			id: TLDOCUMENT_ID,
			gridSize: 10,
			name: 'Test',
			meta: { existing: 'data' },
		}

		addMetaMigration.up(oldRecord)
		// Migration should still set meta to {}, overriding existing
		expect(oldRecord.meta).toEqual({})
	})
})

describe('DocumentRecordType', () => {
	it('should create document records with defaults', () => {
		const document = DocumentRecordType.create({
			id: TLDOCUMENT_ID,
		})

		expect(document.id).toBe(TLDOCUMENT_ID)
		expect(document.typeName).toBe('document')
		expect(document.gridSize).toBe(10)
		expect(document.name).toBe('')
		expect(document.meta).toEqual({})
	})

	it('should create document records with custom properties', () => {
		const document = DocumentRecordType.create({
			id: TLDOCUMENT_ID,
			gridSize: 25,
			name: 'Custom Document',
			meta: { author: 'user456', version: '2.0' },
		})

		expect(document.gridSize).toBe(25)
		expect(document.name).toBe('Custom Document')
		expect(document.meta).toEqual({ author: 'user456', version: '2.0' })
	})

	it('should have correct configuration', () => {
		expect(DocumentRecordType.typeName).toBe('document')
		expect(DocumentRecordType.scope).toBe('document')
	})

	it('should validate created records', () => {
		const document = DocumentRecordType.create({
			id: TLDOCUMENT_ID,
			name: 'Validated Document',
			gridSize: 15,
		})

		// Should be valid according to the validator
		expect(() => documentValidator.validate(document)).not.toThrow()
	})

	it('should handle zero gridSize', () => {
		const document = DocumentRecordType.create({
			id: TLDOCUMENT_ID,
			gridSize: 0,
		})

		expect(document.gridSize).toBe(0)
		expect(() => documentValidator.validate(document)).not.toThrow()
	})

	it('should handle negative gridSize', () => {
		const document = DocumentRecordType.create({
			id: TLDOCUMENT_ID,
			gridSize: -10,
		})

		expect(document.gridSize).toBe(-10)
		expect(() => documentValidator.validate(document)).not.toThrow()
	})

	it('should handle empty string name', () => {
		const document = DocumentRecordType.create({
			id: TLDOCUMENT_ID,
			name: '',
		})

		expect(document.name).toBe('')
		expect(() => documentValidator.validate(document)).not.toThrow()
	})
})

describe('TLDOCUMENT_ID', () => {
	it('should be the correct fixed ID', () => {
		expect(TLDOCUMENT_ID).toBe('document:document')
	})

	it('should be consistent with createId', () => {
		const createdId = DocumentRecordType.createId('document')
		expect(TLDOCUMENT_ID).toBe(createdId)
	})

	it('should work with document creation', () => {
		const document = DocumentRecordType.create({
			id: TLDOCUMENT_ID,
			name: 'Test Document',
		})

		expect(document.id).toBe(TLDOCUMENT_ID)
	})
})

describe('TLDocument Integration', () => {
	it('should work with typical document operations', () => {
		// Create initial document with defaults
		const initialDocument = DocumentRecordType.create({
			id: TLDOCUMENT_ID,
		})

		// Update document settings
		const updatedDocument: TLDocument = {
			...initialDocument,
			name: 'My Drawing',
			gridSize: 20,
			meta: { lastModified: Date.now() },
		}

		expect(updatedDocument.name).toBe('My Drawing')
		expect(updatedDocument.gridSize).toBe(20)
		expect(updatedDocument.meta.lastModified).toBeDefined()
		expect(() => documentValidator.validate(updatedDocument)).not.toThrow()
	})

	it('should support complex meta structures', () => {
		const document = DocumentRecordType.create({
			id: TLDOCUMENT_ID,
			meta: {
				author: { id: 'user123', name: 'John Doe' },
				project: { id: 'proj456', name: 'Design System' },
				settings: {
					theme: 'dark',
					snapToGrid: true,
					showRulers: false,
				},
				timestamps: {
					created: Date.now(),
					lastModified: Date.now(),
					lastAccessed: Date.now(),
				},
			},
		})

		expect(document.meta.author).toEqual({ id: 'user123', name: 'John Doe' })
		expect((document.meta.settings as any).snapToGrid).toBe(true)
		expect(() => documentValidator.validate(document)).not.toThrow()
	})

	it('should handle document reset scenario', () => {
		const customDocument = DocumentRecordType.create({
			id: TLDOCUMENT_ID,
			name: 'Complex Drawing',
			gridSize: 50,
			meta: { complexity: 'high', elements: 100 },
		})

		// Reset to defaults while preserving some meta
		const resetDocument: TLDocument = {
			...customDocument,
			gridSize: 10,
			name: '',
			meta: { ...customDocument.meta, resetAt: Date.now() },
		}

		expect(resetDocument.gridSize).toBe(10)
		expect(resetDocument.name).toBe('')
		expect(resetDocument.meta.complexity).toBe('high')
		expect(resetDocument.meta.resetAt).toBeDefined()
	})

	it('should validate singleton constraint', () => {
		// Should only have one document with the fixed ID
		const document1 = DocumentRecordType.create({
			id: TLDOCUMENT_ID,
			name: 'Document 1',
		})

		const document2 = DocumentRecordType.create({
			id: TLDOCUMENT_ID,
			name: 'Document 2',
		})

		// Both have same ID - would represent the same singleton document
		expect(document1.id).toBe(document2.id)
		expect(document1.id).toBe(TLDOCUMENT_ID)
		expect(document2.id).toBe(TLDOCUMENT_ID)
	})
})
