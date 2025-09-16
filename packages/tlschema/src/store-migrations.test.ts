import { createRecordType } from '@tldraw/store'
import { objectMapEntries } from '@tldraw/utils'
import { describe, expect, it } from 'vitest'
import { getTestMigration } from './__tests__/migrationTestUtils'
import { TLShape } from './records/TLShape'
import { storeMigrations, storeVersions } from './store-migrations'

// Mock record type for testing
const ShapeRecord = createRecordType('shape', {
	validator: { validate: (record) => record as TLShape },
	scope: 'document',
})

describe('storeVersions', () => {
	it('exports version constants for store migrations', () => {
		expect(storeVersions.RemoveCodeAndIconShapeTypes).toBeDefined()
		expect(storeVersions.AddInstancePresenceType).toBeDefined()
		expect(storeVersions.RemoveTLUserAndPresenceAndAddPointer).toBeDefined()
		expect(storeVersions.RemoveUserDocument).toBeDefined()
	})

	it('version constants are in expected order', () => {
		expect(storeVersions.RemoveCodeAndIconShapeTypes).toBe('com.tldraw.store/1')
		expect(storeVersions.AddInstancePresenceType).toBe('com.tldraw.store/2')
		expect(storeVersions.RemoveTLUserAndPresenceAndAddPointer).toBe('com.tldraw.store/3')
		expect(storeVersions.RemoveUserDocument).toBe('com.tldraw.store/4')
	})
})

describe('storeMigrations', () => {
	it('has the correct sequence ID', () => {
		expect(storeMigrations.sequenceId).toBe('com.tldraw.store')
	})

	it('is not retroactive', () => {
		expect(storeMigrations.retroactive).toBe(false)
	})

	it('has all required migrations in sequence', () => {
		expect(storeMigrations.sequence).toHaveLength(4)

		const migrationIds = storeMigrations.sequence.map((m) => m.id)
		expect(migrationIds).toEqual([
			storeVersions.RemoveCodeAndIconShapeTypes,
			storeVersions.AddInstancePresenceType,
			storeVersions.RemoveTLUserAndPresenceAndAddPointer,
			storeVersions.RemoveUserDocument,
		])
	})

	it('all migrations have store scope', () => {
		for (const migration of storeMigrations.sequence) {
			expect(migration.scope).toBe('store')
		}
	})
})

describe('RemoveCodeAndIconShapeTypes migration', () => {
	const { up } = getTestMigration(storeVersions.RemoveCodeAndIconShapeTypes)

	it('removes icon shapes from store', () => {
		const iconShape = ShapeRecord.create({
			type: 'icon',
			parentId: 'page:test',
			index: 'a0',
			props: { name: 'test-icon' },
		} as any)

		const geoShape = ShapeRecord.create({
			type: 'geo',
			parentId: 'page:test',
			index: 'a1',
			props: {
				geo: 'rectangle',
				w: 100,
				h: 100,
				growY: 0,
				richText: null,
			},
		} as any)

		const store = {
			[iconShape.id]: iconShape,
			[geoShape.id]: geoShape,
		}

		const result = up(store)

		expect(result[iconShape.id]).toBeUndefined()
		expect(result[geoShape.id]).toBeDefined()
		expect(Object.keys(result)).toHaveLength(1)
	})

	it('removes code shapes from store', () => {
		const codeShape = ShapeRecord.create({
			type: 'code',
			parentId: 'page:test',
			index: 'a0',
			props: { language: 'javascript', code: 'console.log("hello")' },
		} as any)

		const textShape = ShapeRecord.create({
			type: 'text',
			parentId: 'page:test',
			index: 'a1',
			props: {
				text: 'Hello world',
				size: 'm',
				font: 'draw',
			},
		} as any)

		const store = {
			[codeShape.id]: codeShape,
			[textShape.id]: textShape,
		}

		const result = up(store)

		expect(result[codeShape.id]).toBeUndefined()
		expect(result[textShape.id]).toBeDefined()
		expect(Object.keys(result)).toHaveLength(1)
	})

	it('removes both icon and code shapes together', () => {
		const iconShape = ShapeRecord.create({
			type: 'icon',
			parentId: 'page:test',
			index: 'a0',
			props: { name: 'test-icon' },
		} as any)

		const codeShape = ShapeRecord.create({
			type: 'code',
			parentId: 'page:test',
			index: 'a1',
			props: { language: 'typescript', code: 'const x = 1' },
		} as any)

		const drawShape = ShapeRecord.create({
			type: 'draw',
			parentId: 'page:test',
			index: 'a2',
			props: { segments: [] },
		} as any)

		const store = {
			[iconShape.id]: iconShape,
			[codeShape.id]: codeShape,
			[drawShape.id]: drawShape,
		}

		const result = up(store)

		expect(result[iconShape.id]).toBeUndefined()
		expect(result[codeShape.id]).toBeUndefined()
		expect(result[drawShape.id]).toBeDefined()
		expect(Object.keys(result)).toHaveLength(1)
	})

	it('preserves non-shape records', () => {
		const pageRecord = {
			id: 'page:test',
			typeName: 'page',
			name: 'Test Page',
		}

		const iconShape = ShapeRecord.create({
			type: 'icon',
			parentId: 'page:test',
			index: 'a0',
			props: { name: 'test-icon' },
		} as any)

		const store = {
			[pageRecord.id]: pageRecord,
			[iconShape.id]: iconShape,
		}

		const result = up(store)

		expect(result[pageRecord.id]).toBeDefined()
		expect(result[iconShape.id]).toBeUndefined()
		expect(Object.keys(result)).toHaveLength(1)
	})

	it('handles empty store', () => {
		const store = {}
		const result = up(store)
		expect(result).toEqual({})
		expect(Object.keys(result)).toHaveLength(0)
	})

	it('handles store with no shapes', () => {
		const pageRecord = {
			id: 'page:test',
			typeName: 'page',
			name: 'Test Page',
		}

		const instanceRecord = {
			id: 'instance:test',
			typeName: 'instance',
			currentPageId: 'page:test',
		}

		const store = {
			[pageRecord.id]: pageRecord,
			[instanceRecord.id]: instanceRecord,
		}

		const result = up(store)

		expect(result[pageRecord.id]).toBeDefined()
		expect(result[instanceRecord.id]).toBeDefined()
		expect(Object.keys(result)).toHaveLength(2)
	})

	it('handles store with only valid shapes', () => {
		const geoShape = ShapeRecord.create({
			type: 'geo',
			parentId: 'page:test',
			index: 'a0',
			props: {
				geo: 'rectangle',
				w: 100,
				h: 100,
			},
		} as any)

		const textShape = ShapeRecord.create({
			type: 'text',
			parentId: 'page:test',
			index: 'a1',
			props: {
				text: 'Hello world',
			},
		} as any)

		const store = {
			[geoShape.id]: geoShape,
			[textShape.id]: textShape,
		}

		const result = up(store)

		expect(result[geoShape.id]).toBeDefined()
		expect(result[textShape.id]).toBeDefined()
		expect(Object.keys(result)).toHaveLength(2)
	})

	it('properly modifies and returns the store object', () => {
		const iconShape = ShapeRecord.create({
			type: 'icon',
			parentId: 'page:test',
			index: 'a0',
			props: { name: 'test-icon' },
		} as any)

		const store = {
			[iconShape.id]: iconShape,
		}

		const result = up(store)

		// The migration returns the modified store
		expect(result[iconShape.id]).toBeUndefined()
		expect(Object.keys(result)).toHaveLength(0)
	})
})

describe('AddInstancePresenceType migration', () => {
	const { up } = getTestMigration(storeVersions.AddInstancePresenceType)

	it('is a no-op migration', () => {
		const store = {
			'page:test': {
				id: 'page:test',
				typeName: 'page',
				name: 'Test Page',
			},
			'instance:test': {
				id: 'instance:test',
				typeName: 'instance',
				currentPageId: 'page:test',
			},
		}

		const originalStore = { ...store }
		const result = up(store)

		expect(result).toEqual(originalStore)
	})

	it('handles empty store', () => {
		const store = {}
		const result = up(store)
		expect(result).toEqual({})
	})
})

describe('RemoveTLUserAndPresenceAndAddPointer migration', () => {
	const { up } = getTestMigration(storeVersions.RemoveTLUserAndPresenceAndAddPointer)

	it('removes user records', () => {
		const userRecord = {
			id: 'user:123',
			typeName: 'user',
			name: 'Test User',
			avatar: 'https://example.com/avatar.png',
		}

		const instanceRecord = {
			id: 'instance:456',
			typeName: 'instance',
			currentPageId: 'page:test',
		}

		const store = {
			[userRecord.id]: userRecord,
			[instanceRecord.id]: instanceRecord,
		}

		const result = up(store)

		expect(result[userRecord.id]).toBeUndefined()
		expect(result[instanceRecord.id]).toBeDefined()
		expect(Object.keys(result)).toHaveLength(1)
	})

	it('removes user_presence records', () => {
		const userPresenceRecord = {
			id: 'user_presence:789',
			typeName: 'user_presence',
			userId: 'user:123',
			cursor: { x: 100, y: 200 },
		}

		const pageRecord = {
			id: 'page:test',
			typeName: 'page',
			name: 'Test Page',
		}

		const store = {
			[userPresenceRecord.id]: userPresenceRecord,
			[pageRecord.id]: pageRecord,
		}

		const result = up(store)

		expect(result[userPresenceRecord.id]).toBeUndefined()
		expect(result[pageRecord.id]).toBeDefined()
		expect(Object.keys(result)).toHaveLength(1)
	})

	it('removes both user and user_presence records', () => {
		const userRecord = {
			id: 'user:123',
			typeName: 'user',
			name: 'Test User',
		}

		const userPresenceRecord = {
			id: 'user_presence:789',
			typeName: 'user_presence',
			userId: 'user:123',
		}

		const instanceRecord = {
			id: 'instance:456',
			typeName: 'instance',
			currentPageId: 'page:test',
		}

		const store = {
			[userRecord.id]: userRecord,
			[userPresenceRecord.id]: userPresenceRecord,
			[instanceRecord.id]: instanceRecord,
		}

		const result = up(store)

		expect(result[userRecord.id]).toBeUndefined()
		expect(result[userPresenceRecord.id]).toBeUndefined()
		expect(result[instanceRecord.id]).toBeDefined()
		expect(Object.keys(result)).toHaveLength(1)
	})

	it('preserves other record types', () => {
		const userRecord = {
			id: 'user:123',
			typeName: 'user',
			name: 'Test User',
		}

		const pageRecord = {
			id: 'page:test',
			typeName: 'page',
			name: 'Test Page',
		}

		const instanceRecord = {
			id: 'instance:456',
			typeName: 'instance',
			currentPageId: 'page:test',
		}

		const instancePresenceRecord = {
			id: 'instance_presence:789',
			typeName: 'instance_presence',
			cursor: { x: 100, y: 200 },
		}

		const store = {
			[userRecord.id]: userRecord,
			[pageRecord.id]: pageRecord,
			[instanceRecord.id]: instanceRecord,
			[instancePresenceRecord.id]: instancePresenceRecord,
		}

		const result = up(store)

		expect(result[userRecord.id]).toBeUndefined()
		expect(result[pageRecord.id]).toBeDefined()
		expect(result[instanceRecord.id]).toBeDefined()
		expect(result[instancePresenceRecord.id]).toBeDefined()
		expect(Object.keys(result)).toHaveLength(3)
	})

	it('handles empty store', () => {
		const store = {}
		const result = up(store)
		expect(result).toEqual({})
	})

	it('handles store with no user or user_presence records', () => {
		const pageRecord = {
			id: 'page:test',
			typeName: 'page',
			name: 'Test Page',
		}

		const instanceRecord = {
			id: 'instance:456',
			typeName: 'instance',
			currentPageId: 'page:test',
		}

		const store = {
			[pageRecord.id]: pageRecord,
			[instanceRecord.id]: instanceRecord,
		}

		const result = up(store)

		expect(result[pageRecord.id]).toBeDefined()
		expect(result[instanceRecord.id]).toBeDefined()
		expect(Object.keys(result)).toHaveLength(2)
	})

	it('uses regex to match record types', () => {
		// Test edge case records with similar names
		const userLikeRecord = {
			id: 'user_something:123',
			typeName: 'user_something',
			data: 'test',
		}

		const userPresenceLikeRecord = {
			id: 'user_presence_like:456',
			typeName: 'user_presence_like',
			data: 'test',
		}

		const exactUserRecord = {
			id: 'user:789',
			typeName: 'user',
			name: 'Test User',
		}

		const exactUserPresenceRecord = {
			id: 'user_presence:101',
			typeName: 'user_presence',
			userId: 'user:789',
		}

		const store = {
			[userLikeRecord.id]: userLikeRecord,
			[userPresenceLikeRecord.id]: userPresenceLikeRecord,
			[exactUserRecord.id]: exactUserRecord,
			[exactUserPresenceRecord.id]: exactUserPresenceRecord,
		}

		const result = up(store)

		// Only exact matches should be removed
		expect(result[userLikeRecord.id]).toBeDefined()
		expect(result[userPresenceLikeRecord.id]).toBeDefined()
		expect(result[exactUserRecord.id]).toBeUndefined()
		expect(result[exactUserPresenceRecord.id]).toBeUndefined()
		expect(Object.keys(result)).toHaveLength(2)
	})
})

describe('RemoveUserDocument migration', () => {
	const { up } = getTestMigration(storeVersions.RemoveUserDocument)

	it('removes user_document records', () => {
		const userDocumentRecord = {
			id: 'user_document:123',
			typeName: 'user_document',
			userId: 'user:456',
			documentId: 'doc:789',
		}

		const instanceRecord = {
			id: 'instance:456',
			typeName: 'instance',
			currentPageId: 'page:test',
		}

		const store = {
			[userDocumentRecord.id]: userDocumentRecord,
			[instanceRecord.id]: instanceRecord,
		}

		const result = up(store)

		expect(result[userDocumentRecord.id]).toBeUndefined()
		expect(result[instanceRecord.id]).toBeDefined()
		expect(Object.keys(result)).toHaveLength(1)
	})

	it('removes multiple user_document records', () => {
		const userDoc1 = {
			id: 'user_document:123',
			typeName: 'user_document',
			userId: 'user:456',
		}

		const userDoc2 = {
			id: 'user_document:789',
			typeName: 'user_document',
			userId: 'user:456',
		}

		const pageRecord = {
			id: 'page:test',
			typeName: 'page',
			name: 'Test Page',
		}

		const store = {
			[userDoc1.id]: userDoc1,
			[userDoc2.id]: userDoc2,
			[pageRecord.id]: pageRecord,
		}

		const result = up(store)

		expect(result[userDoc1.id]).toBeUndefined()
		expect(result[userDoc2.id]).toBeUndefined()
		expect(result[pageRecord.id]).toBeDefined()
		expect(Object.keys(result)).toHaveLength(1)
	})

	it('preserves other record types', () => {
		const userDocumentRecord = {
			id: 'user_document:123',
			typeName: 'user_document',
			userId: 'user:456',
		}

		const documentRecord = {
			id: 'document:789',
			typeName: 'document',
			name: 'Test Document',
		}

		const instanceRecord = {
			id: 'instance:456',
			typeName: 'instance',
			currentPageId: 'page:test',
		}

		const store = {
			[userDocumentRecord.id]: userDocumentRecord,
			[documentRecord.id]: documentRecord,
			[instanceRecord.id]: instanceRecord,
		}

		const result = up(store)

		expect(result[userDocumentRecord.id]).toBeUndefined()
		expect(result[documentRecord.id]).toBeDefined()
		expect(result[instanceRecord.id]).toBeDefined()
		expect(Object.keys(result)).toHaveLength(2)
	})

	it('handles empty store', () => {
		const store = {}
		const result = up(store)
		expect(result).toEqual({})
	})

	it('handles store with no user_document records', () => {
		const pageRecord = {
			id: 'page:test',
			typeName: 'page',
			name: 'Test Page',
		}

		const instanceRecord = {
			id: 'instance:456',
			typeName: 'instance',
			currentPageId: 'page:test',
		}

		const store = {
			[pageRecord.id]: pageRecord,
			[instanceRecord.id]: instanceRecord,
		}

		const result = up(store)

		expect(result[pageRecord.id]).toBeDefined()
		expect(result[instanceRecord.id]).toBeDefined()
		expect(Object.keys(result)).toHaveLength(2)
	})

	it('uses string match for type name detection', () => {
		// Test records with user_document in the name
		const partialMatch = {
			id: 'user_document_meta:123',
			typeName: 'user_document_meta',
			data: 'test',
		}

		const exactMatch = {
			id: 'user_document:456',
			typeName: 'user_document',
			userId: 'user:789',
		}

		const store = {
			[partialMatch.id]: partialMatch,
			[exactMatch.id]: exactMatch,
		}

		const result = up(store)

		// Both should be removed as the regex uses match() which finds substring
		expect(result[partialMatch.id]).toBeUndefined()
		expect(result[exactMatch.id]).toBeUndefined()
		expect(Object.keys(result)).toHaveLength(0)
	})
})

describe('store-migrations integration', () => {
	it('migrations work with objectMapEntries utility', () => {
		const testStore = {
			'shape:icon1': {
				id: 'shape:icon1',
				typeName: 'shape',
				type: 'icon',
				props: { name: 'test' },
			},
			'user:123': {
				id: 'user:123',
				typeName: 'user',
				name: 'Test User',
			},
			'user_presence:456': {
				id: 'user_presence:456',
				typeName: 'user_presence',
				userId: 'user:123',
			},
			'user_document:789': {
				id: 'user_document:789',
				typeName: 'user_document',
				userId: 'user:123',
			},
			'page:test': {
				id: 'page:test',
				typeName: 'page',
				name: 'Test Page',
			},
		}

		// Test that objectMapEntries works correctly with the migration functions
		const entries = objectMapEntries(testStore)
		expect(entries).toHaveLength(5)

		// Each entry should be a [key, value] pair
		for (const [id, record] of entries) {
			expect(typeof id).toBe('string')
			expect(record).toBeDefined()
			expect(record.id).toBe(id)
		}
	})

	it('sequential migration application', () => {
		// Test applying migrations in sequence
		let store = {
			'shape:icon1': {
				id: 'shape:icon1',
				typeName: 'shape',
				type: 'icon',
				props: { name: 'test' },
			},
			'shape:code1': {
				id: 'shape:code1',
				typeName: 'shape',
				type: 'code',
				props: { language: 'js' },
			},
			'user:123': {
				id: 'user:123',
				typeName: 'user',
				name: 'Test User',
			},
			'user_presence:456': {
				id: 'user_presence:456',
				typeName: 'user_presence',
				userId: 'user:123',
			},
			'user_document:789': {
				id: 'user_document:789',
				typeName: 'user_document',
				userId: 'user:123',
			},
			'page:test': {
				id: 'page:test',
				typeName: 'page',
				name: 'Test Page',
			},
		}

		// Apply RemoveCodeAndIconShapeTypes
		const { up: removeShapes } = getTestMigration(storeVersions.RemoveCodeAndIconShapeTypes)
		store = removeShapes(store)
		expect(store['shape:icon1']).toBeUndefined()
		expect(store['shape:code1']).toBeUndefined()
		expect(Object.keys(store)).toHaveLength(4)

		// Apply AddInstancePresenceType (no-op)
		const { up: addPresence } = getTestMigration(storeVersions.AddInstancePresenceType)
		store = addPresence(store)
		expect(Object.keys(store)).toHaveLength(4)

		// Apply RemoveTLUserAndPresenceAndAddPointer
		const { up: removeUserPresence } = getTestMigration(
			storeVersions.RemoveTLUserAndPresenceAndAddPointer
		)
		store = removeUserPresence(store)
		expect(store['user:123']).toBeUndefined()
		expect(store['user_presence:456']).toBeUndefined()
		expect(Object.keys(store)).toHaveLength(2)

		// Apply RemoveUserDocument
		const { up: removeUserDoc } = getTestMigration(storeVersions.RemoveUserDocument)
		store = removeUserDoc(store)
		expect(store['user_document:789']).toBeUndefined()
		expect(Object.keys(store)).toHaveLength(1)

		// Only the page should remain
		expect(store['page:test']).toBeDefined()
	})

	it('migration functions handle malformed data appropriately', () => {
		const malformedStore = {
			'shape:icon1': {
				// Missing required properties
				id: 'shape:icon1',
				typeName: 'shape',
				type: 'icon',
			},
			'invalid:record': {
				// Missing typeName
				id: 'invalid:record',
				data: 'test',
			},
			'valid:page': {
				id: 'valid:page',
				typeName: 'page',
				name: 'Test Page',
			},
		}

		const { up } = getTestMigration(storeVersions.RemoveCodeAndIconShapeTypes)

		const result = up(malformedStore)

		// Icon shape should be removed despite missing properties
		expect(result['shape:icon1']).toBeUndefined()

		// Other records should remain
		expect(result['invalid:record']).toBeDefined()
		expect(result['valid:page']).toBeDefined()
	})
})

describe('edge cases and error handling', () => {
	it('handles circular references in store', () => {
		const obj1: any = { id: 'obj1', typeName: 'page' }
		const obj2: any = { id: 'obj2', typeName: 'page', ref: obj1 }
		obj1.ref = obj2 // Create circular reference

		const store = {
			[obj1.id]: obj1,
			[obj2.id]: obj2,
		}

		const { up } = getTestMigration(storeVersions.AddInstancePresenceType)

		// Should handle circular references without throwing
		expect(() => up(store)).not.toThrow()
	})

	it('handles stores with special properties', () => {
		const store = Object.create({ prototypeMethod: () => 'test' })
		store['page:test'] = {
			id: 'page:test',
			typeName: 'page',
			name: 'Test Page',
		}

		// Add non-enumerable property
		Object.defineProperty(store, 'hiddenProp', {
			value: 'hidden',
			enumerable: false,
		})

		const { up } = getTestMigration(storeVersions.AddInstancePresenceType)
		const result = up(store)

		// The test migration utility uses structuredClone which creates a plain object
		// but the original properties are still accessible
		expect(result['page:test']).toBeDefined()
		expect(result['page:test'].name).toBe('Test Page')
	})
})
