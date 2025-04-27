import { SerializedStore } from '../Store'
import { testSchemaV0 } from './testSchema.v0'
import { testSchemaV1 } from './testSchema.v1'

const serializedV0Schenma = testSchemaV0.serialize()
const serializedV1Schenma = testSchemaV1.serialize()

test('serializedV0Schenma', () => {
	expect(serializedV0Schenma).toMatchInlineSnapshot(`
		{
		  "schemaVersion": 2,
		  "sequences": {},
		}
	`)
})

test('serializedV1Schenma', () => {
	expect(serializedV1Schenma).toMatchInlineSnapshot(`
		{
		  "schemaVersion": 2,
		  "sequences": {
		    "com.tldraw.shape": 2,
		    "com.tldraw.shape.oval": 1,
		    "com.tldraw.shape.rectangle": 1,
		    "com.tldraw.store": 1,
		    "com.tldraw.user": 2,
		  },
		}
	`)
})

test('unknown types fail', () => {
	expect(
		testSchemaV1.migratePersistedRecord(
			{
				id: 'whatevere',
				typeName: 'steve',
			} as any,
			serializedV0Schenma,
			'up'
		)
	).toMatchObject({
		type: 'error',
	})

	expect(
		testSchemaV1.migratePersistedRecord(
			{
				id: 'whatevere',
				typeName: 'jeff',
			} as any,
			serializedV0Schenma,
			'down'
		)
	).toMatchObject({
		type: 'error',
	})
})

test('migrating a whole store snapshot works', () => {
	const serializedStore: SerializedStore<any> = {
		'user-1': {
			id: 'user-1',
			typeName: 'user',
			name: 'name',
		},
		'shape-1': {
			id: 'shape-1',
			typeName: 'shape',
			x: 0,
			y: 0,
			type: 'rectangle',
			props: {
				width: 100,
				height: 100,
			},
		},
		'org-1': {
			id: 'org-1',
			typeName: 'org',
			name: 'tldraw',
		},
	}

	const result = testSchemaV1.migrateStoreSnapshot({
		store: serializedStore,
		schema: serializedV0Schenma,
	})

	if (result.type !== 'success') {
		console.error(result)
		throw new Error('Migration failed')
	}

	expect(result.value).toEqual({
		'shape-1': {
			id: 'shape-1',
			typeName: 'shape',
			x: 0,
			y: 0,
			type: 'rectangle',
			parentId: null,
			rotation: 0,
			props: {
				width: 100,
				height: 100,
				opacity: 1,
			},
		},
		'user-1': {
			id: 'user-1',
			typeName: 'user',
			name: 'name',
			locale: 'en',
			phoneNumber: null,
		},
	})
})
