import { SerializedStore } from '../Store'
import { testSchemaV0 } from './testSchema.v0'
import { testSchemaV1 } from './testSchema.v1'

const serializedV0Schenma = testSchemaV0.serialize()

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
			count: 1, // set by store migration, incremented by record migration; if the store migration didn't run, this would be NaN
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
			count: 0, // set by store migration
			phoneNumber: null,
		},
	})
})
