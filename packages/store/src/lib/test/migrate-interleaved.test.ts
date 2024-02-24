import { SerializedStore } from '../Store'
import { testSchemaV1 } from './testSchema.v1'

const serializedV1Schenma = testSchemaV1.serialize()

test('migrating a whole store snapshot with other record snapshots that are interleaved', () => {
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
		'shape-2': {
			id: 'shape-2',
			typeName: 'shape',
			x: 0,
			y: 0,
			type: 'oval',
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
		schema: serializedV1Schenma,
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
			count: 0,
			props: {
				width: 100,
				height: 100,
				opacity: 1,
			},
		},
		'shape-2': {
			id: 'shape-2',
			typeName: 'shape',
			x: 0,
			y: 0,
			type: 'oval',
			parentId: null,
			rotation: 0,
			count: 1,
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
			count: 0,
		},
	})
})
