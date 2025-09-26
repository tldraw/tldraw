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
})

describe('documentMigrations', () => {
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
})
