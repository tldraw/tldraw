import { MigrationFailureReason } from '../migrate'
import { SerializedStore } from '../Store'
import { testSchemaV0 } from './testSchema.v0'
import { testSchemaV1 } from './testSchema.v1'

const serializedV0Schenma = testSchemaV0.serialize()
const serializedV1Schenma = testSchemaV1.serialize()

test('serializedV0Schenma', () => {
	expect(serializedV0Schenma).toMatchInlineSnapshot(`
		Object {
		  "recordVersions": Object {
		    "org": Object {
		      "version": 0,
		    },
		    "shape": Object {
		      "subTypeKey": "type",
		      "subTypeVersions": Object {
		        "rectangle": 0,
		      },
		      "version": 0,
		    },
		    "user": Object {
		      "version": 0,
		    },
		  },
		  "schemaVersion": 1,
		  "storeVersion": 0,
		}
	`)
})

test('serializedV1Schenma', () => {
	expect(serializedV1Schenma).toMatchInlineSnapshot(`
		Object {
		  "recordVersions": Object {
		    "shape": Object {
		      "subTypeKey": "type",
		      "subTypeVersions": Object {
		        "oval": 1,
		        "rectangle": 1,
		      },
		      "version": 2,
		    },
		    "user": Object {
		      "version": 2,
		    },
		  },
		  "schemaVersion": 1,
		  "storeVersion": 1,
		}
	`)
})

describe('migrating from v0 to v1', () => {
	it('works for a user', () => {
		const user = {
			id: 'user-1',
			typeName: 'user',
			name: 'name',
		}
		const userResult = testSchemaV1.migratePersistedRecord(user as any, serializedV0Schenma)

		if (userResult.type !== 'success') {
			throw new Error('Migration failed')
		}

		expect(userResult.value).toEqual({
			id: 'user-1',
			typeName: 'user',
			name: 'name',
			locale: 'en',
			phoneNumber: null,
		})
	})

	it('works for a rectangle', () => {
		const rectangle = {
			id: 'shape-1',
			typeName: 'shape',
			x: 0,
			y: 0,
			type: 'rectangle',
			props: {
				width: 100,
				height: 100,
			},
		}

		const shapeResult = testSchemaV1.migratePersistedRecord(rectangle as any, serializedV0Schenma)

		if (shapeResult.type !== 'success') {
			throw new Error('Migration failed')
		}

		expect(shapeResult.value).toEqual({
			id: 'shape-1',
			typeName: 'shape',
			x: 0,
			y: 0,
			rotation: 0,
			parentId: null,
			type: 'rectangle',
			props: {
				width: 100,
				height: 100,
				opacity: 1,
			},
		})
	})

	it('does not work for an oval because the oval didnt exist in v0', () => {
		const oval = {
			id: 'shape-2',
			typeName: 'shape',
			x: 0,
			y: 0,
			type: 'oval',
			props: {
				radius: 50,
			},
		}

		const ovalResult = testSchemaV1.migratePersistedRecord(oval as any, serializedV0Schenma)

		expect(ovalResult).toEqual({
			type: 'error',
			reason: MigrationFailureReason.IncompatibleSubtype,
		})
	})
})

describe('migrating from v1 to v0', () => {
	it('works for a user', () => {
		const user = {
			id: 'user-1',
			typeName: 'user',
			name: 'name',
			locale: 'en',
			phoneNumber: null,
		}

		const userResult = testSchemaV1.migratePersistedRecord(user as any, serializedV0Schenma, 'down')

		if (userResult.type !== 'success') {
			console.error(userResult)
			throw new Error('Migration failed')
		}

		expect(userResult.value).toEqual({
			id: 'user-1',
			typeName: 'user',
			name: 'name',
		})
	})

	it('works for a rectangle', () => {
		const rectangle = {
			id: 'shape-1',
			typeName: 'shape',
			x: 0,
			y: 0,
			rotation: 0,
			parentId: null,
			type: 'rectangle',
			props: {
				width: 100,
				height: 100,
				opacity: 1,
			},
		}

		const shapeResult = testSchemaV1.migratePersistedRecord(
			rectangle as any,
			serializedV0Schenma,
			'down'
		)

		if (shapeResult.type !== 'success') {
			console.error(shapeResult)
			throw new Error('Migration failed')
		}

		expect(shapeResult.value).toEqual({
			id: 'shape-1',
			typeName: 'shape',
			x: 0,
			y: 0,
			type: 'rectangle',
			props: {
				width: 100,
				height: 100,
			},
		})
	})

	it('does not work for an oval because the oval didnt exist in v0', () => {
		const oval = {
			id: 'shape-2',
			typeName: 'shape',
			x: 0,
			y: 0,
			type: 'oval',
			props: {
				radius: 50,
			},
		}

		const ovalResult = testSchemaV1.migratePersistedRecord(oval as any, serializedV0Schenma, 'down')

		expect(ovalResult).toEqual({
			type: 'error',
			reason: MigrationFailureReason.IncompatibleSubtype,
		})
	})
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
	).toEqual({
		type: 'error',
		reason: MigrationFailureReason.UnknownType,
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
	).toEqual({
		type: 'error',
		reason: MigrationFailureReason.UnknownType,
	})
})

test('versions in the future fail', () => {
	expect(
		testSchemaV0.migratePersistedRecord(
			{
				id: 'whatevere',
				typeName: 'user',
				name: 'steve',
			} as any,
			serializedV1Schenma
		)
	).toEqual({
		type: 'error',
		reason: MigrationFailureReason.TargetVersionTooOld,
	})
})

test('unrecogized subtypes fail', () => {
	expect(
		testSchemaV1.migratePersistedRecord(
			{
				id: 'whatevere',
				typeName: 'shape',
				type: 'whatever',
			} as any,
			serializedV0Schenma
		)
	).toEqual({
		type: 'error',
		reason: MigrationFailureReason.UnrecognizedSubtype,
	})
})

test('subtype versions in the future fail', () => {
	expect(
		testSchemaV0.migratePersistedRecord(
			{
				id: 'whatevere',
				typeName: 'shape',
				type: 'rectangle',
			} as any,
			{
				schemaVersion: 0,
				storeVersion: 0,
				recordVersions: {
					shape: {
						version: 0,
						subTypeVersions: {
							rectangle: 1,
						},
					},
				},
			}
		)
	).toEqual({
		type: 'error',
		reason: MigrationFailureReason.TargetVersionTooOld,
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
