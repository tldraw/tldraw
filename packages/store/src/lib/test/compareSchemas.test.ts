import { compareSchemas } from '../compareSchemas'
import { testSchemaV0 } from './testSchema.v0'
import { testSchemaV1 } from './testSchema.v1'

describe('compareSchemas', () => {
	it('returns 0 for identical schemas', () => {
		expect(compareSchemas(testSchemaV0.serialize(), testSchemaV0.serialize())).toBe(0)
		expect(
			compareSchemas(JSON.parse(JSON.stringify(testSchemaV0.serialize())), testSchemaV0.serialize())
		).toBe(0)
		expect(
			compareSchemas(testSchemaV0.serialize(), JSON.parse(JSON.stringify(testSchemaV0.serialize())))
		).toBe(0)
		expect(
			compareSchemas(
				JSON.parse(JSON.stringify(testSchemaV0.serialize())),
				JSON.parse(JSON.stringify(testSchemaV0.serialize()))
			)
		).toBe(0)
	})

	it('returns 1 when the left schema is later than the right schema', () => {
		expect(
			compareSchemas(JSON.parse(JSON.stringify(testSchemaV1.serialize())), testSchemaV0.serialize())
		).toBe(1)
		expect(
			compareSchemas(testSchemaV1.serialize(), JSON.parse(JSON.stringify(testSchemaV0.serialize())))
		).toBe(1)
		expect(
			compareSchemas(
				JSON.parse(JSON.stringify(testSchemaV1.serialize())),
				JSON.parse(JSON.stringify(testSchemaV0.serialize()))
			)
		).toBe(1)
	})

	it('returns -1 when the left schema is earlier than the right schema', () => {
		expect(
			compareSchemas(JSON.parse(JSON.stringify(testSchemaV0.serialize())), testSchemaV1.serialize())
		).toBe(-1)
		expect(
			compareSchemas(testSchemaV0.serialize(), JSON.parse(JSON.stringify(testSchemaV1.serialize())))
		).toBe(-1)
		expect(
			compareSchemas(
				JSON.parse(JSON.stringify(testSchemaV0.serialize())),
				JSON.parse(JSON.stringify(testSchemaV1.serialize()))
			)
		).toBe(-1)
	})

	it('returns -1 if a sequence is present in both schemas and the left one is lower than the right', () => {
		expect(
			compareSchemas(
				{
					schemaVersion: 2,
					sequences: {
						foo: {
							retroactive: false,
							version: 1,
						},
					},
				},
				{
					schemaVersion: 2,
					sequences: {
						foo: {
							retroactive: false,
							version: 2,
						},
					},
				}
			)
		).toBe(-1)
	})

	it('returns -1 if a sequence is present in both schemas and the left one is lower than the right', () => {
		expect(
			compareSchemas(
				{
					schemaVersion: 2,
					sequences: {
						foo: {
							retroactive: false,
							version: 2,
						},
					},
				},
				{
					schemaVersion: 2,
					sequences: {
						foo: {
							retroactive: false,
							version: 1,
						},
					},
				}
			)
		).toBe(1)
	})
})
