import {
	createCustomShapeId,
	createDefaultTldrawEditorSchema,
	InstanceRecordType,
	TLStoreSchema,
} from '@tldraw/editor'
import { MigrationFailureReason, UnknownRecord } from '@tldraw/tlstore'
import { assert } from '@tldraw/utils'
import { parseTldrawJsonFile as _parseTldrawJsonFile, TldrawFile } from '../lib/file'

const parseTldrawJsonFile = (schema: TLStoreSchema, json: string) =>
	_parseTldrawJsonFile({
		schema,
		json,
		instanceId: InstanceRecordType.createCustomId('instance'),
	})

function serialize(file: TldrawFile): string {
	return JSON.stringify(file)
}

describe('parseTldrawJsonFile', () => {
	it('returns an error if the file is not json', () => {
		const result = parseTldrawJsonFile(createDefaultTldrawEditorSchema(), 'not json')
		assert(!result.ok)
		expect(result.error.type).toBe('notATldrawFile')
	})

	it("returns an error if the file doesn't look like a tldraw file", () => {
		const result = parseTldrawJsonFile(
			createDefaultTldrawEditorSchema(),
			JSON.stringify({ not: 'a tldraw file' })
		)
		assert(!result.ok)
		expect(result.error.type).toBe('notATldrawFile')
	})

	it('returns an error if the file version is too old', () => {
		const schema = createDefaultTldrawEditorSchema()
		const result = parseTldrawJsonFile(
			schema,
			serialize({
				tldrawFileFormatVersion: 0,
				schema: schema.serialize(),
				records: [],
			})
		)
		assert(!result.ok)
		expect(result.error.type).toBe('notATldrawFile')
	})

	it('returns an error if the file version is too new', () => {
		const schema = createDefaultTldrawEditorSchema()
		const result = parseTldrawJsonFile(
			schema,
			serialize({
				tldrawFileFormatVersion: 100,
				schema: schema.serialize(),
				records: [],
			})
		)
		assert(!result.ok)
		expect(result.error.type).toBe('fileFormatVersionTooNew')
	})

	it('returns an error if migrations fail', () => {
		const schema = createDefaultTldrawEditorSchema()
		const serializedSchema = schema.serialize()
		serializedSchema.storeVersion = 100
		const result = parseTldrawJsonFile(
			schema,
			serialize({
				tldrawFileFormatVersion: 1,
				schema: serializedSchema,
				records: [],
			})
		)
		assert(!result.ok)
		assert(result.error.type === 'migrationFailed')
		expect(result.error.reason).toBe(MigrationFailureReason.TargetVersionTooOld)

		const schema2 = createDefaultTldrawEditorSchema()
		const serializedSchema2 = schema2.serialize()
		serializedSchema2.recordVersions.shape.version = 100
		const result2 = parseTldrawJsonFile(
			schema2,
			serialize({
				tldrawFileFormatVersion: 1,
				schema: serializedSchema2,
				records: [{ typeName: 'shape', id: createCustomShapeId('shape') }],
			})
		)

		assert(!result2.ok)
		assert(result2.error.type === 'migrationFailed')
		expect(result2.error.reason).toBe(MigrationFailureReason.TargetVersionTooOld)
	})

	it('returns an error if a record is invalid', () => {
		const schema = createDefaultTldrawEditorSchema()
		const result = parseTldrawJsonFile(
			schema,
			serialize({
				tldrawFileFormatVersion: 1,
				schema: schema.serialize(),
				records: [
					{
						typeName: 'shape',
						id: createCustomShapeId('shape'),
						type: 'geo',
						props: {},
					} as UnknownRecord,
				],
			})
		)

		assert(!result.ok)
		assert(result.error.type === 'invalidRecords')
		expect(result.error.cause).toMatchInlineSnapshot(
			`[ValidationError: At (typeName = shape).shape(id = shape:shape, type = geo).x: Expected number, got undefined]`
		)
	})

	it('returns a store if the file is valid', () => {
		const schema = createDefaultTldrawEditorSchema()
		const result = parseTldrawJsonFile(
			schema,
			serialize({
				tldrawFileFormatVersion: 1,
				schema: schema.serialize(),
				records: [],
			})
		)
		assert(result.ok)
	})
})
