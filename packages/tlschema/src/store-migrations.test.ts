import { describe, expect, it } from 'vitest'
import { getTestMigration } from './__tests__/migrationTestUtils'
import { storeMigrations, storeVersions } from './store-migrations'

describe('storeVersions', () => {
	it('version constants are in expected order', () => {
		expect(storeVersions.RemoveCodeAndIconShapeTypes).toBe('com.tldraw.store/1')
		expect(storeVersions.AddInstancePresenceType).toBe('com.tldraw.store/2')
		expect(storeVersions.RemoveTLUserAndPresenceAndAddPointer).toBe('com.tldraw.store/3')
		expect(storeVersions.RemoveUserDocument).toBe('com.tldraw.store/4')
	})
})

describe('storeMigrations', () => {
	it('has all required migrations in sequence', () => {
		expect(storeMigrations.sequence).toHaveLength(4)
		expect(storeMigrations.sequenceId).toBe('com.tldraw.store')
		expect(storeMigrations.retroactive).toBe(false)

		const migrationIds = storeMigrations.sequence.map((m) => m.id)
		expect(migrationIds).toEqual([
			storeVersions.RemoveCodeAndIconShapeTypes,
			storeVersions.AddInstancePresenceType,
			storeVersions.RemoveTLUserAndPresenceAndAddPointer,
			storeVersions.RemoveUserDocument,
		])
	})
})

describe('RemoveCodeAndIconShapeTypes migration', () => {
	const { up } = getTestMigration(storeVersions.RemoveCodeAndIconShapeTypes)

	it('removes icon and code shapes from store', () => {
		const store = {
			'shape:icon1': { typeName: 'shape', type: 'icon' },
			'shape:code1': { typeName: 'shape', type: 'code' },
			'shape:geo1': { typeName: 'shape', type: 'geo' },
			'page:test': { typeName: 'page' },
		}

		const result = up(store)

		expect(result['shape:icon1']).toBeUndefined()
		expect(result['shape:code1']).toBeUndefined()
		expect(result['shape:geo1']).toBeDefined()
		expect(result['page:test']).toBeDefined()
	})
})

describe('AddInstancePresenceType migration', () => {
	const { up } = getTestMigration(storeVersions.AddInstancePresenceType)

	it('is a no-op migration', () => {
		const store = { 'page:test': { typeName: 'page' } }
		const result = up(store)
		expect(result).toEqual(store)
	})
})

describe('RemoveTLUserAndPresenceAndAddPointer migration', () => {
	const { up } = getTestMigration(storeVersions.RemoveTLUserAndPresenceAndAddPointer)

	it('removes user and user_presence records', () => {
		const store = {
			'user:123': { typeName: 'user' },
			'user_presence:456': { typeName: 'user_presence' },
			'instance:789': { typeName: 'instance' },
			'user_something:abc': { typeName: 'user_something' }, // Should not match
		}

		const result = up(store)

		expect(result['user:123']).toBeUndefined()
		expect(result['user_presence:456']).toBeUndefined()
		expect(result['instance:789']).toBeDefined()
		expect(result['user_something:abc']).toBeDefined() // Uses exact regex match
	})
})

describe('RemoveUserDocument migration', () => {
	const { up } = getTestMigration(storeVersions.RemoveUserDocument)

	it('removes user_document records', () => {
		const store = {
			'user_document:123': { typeName: 'user_document' },
			'user_document_meta:456': { typeName: 'user_document_meta' }, // Also matches due to substring
			'document:789': { typeName: 'document' },
			'instance:abc': { typeName: 'instance' },
		}

		const result = up(store)

		expect(result['user_document:123']).toBeUndefined()
		expect(result['user_document_meta:456']).toBeUndefined() // Uses match() which finds substring
		expect(result['document:789']).toBeDefined()
		expect(result['instance:abc']).toBeDefined()
	})
})
