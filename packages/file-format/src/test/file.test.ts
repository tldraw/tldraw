import { createCustomShapeId, TldrawEditorConfig, TLInstance } from '@tldraw/editor'
import { MigrationFailureReason, UnknownRecord } from '@tldraw/tlstore'
import { assert } from '@tldraw/utils'
import { parseTldrawJsonFile as _parseTldrawJsonFile, TldrawFile } from '../lib/file'

const parseTldrawJsonFile = (config: TldrawEditorConfig, json: string) =>
	_parseTldrawJsonFile({
		config,
		json,
		instanceId: TLInstance.createCustomId('instance'),
	})

function serialize(file: TldrawFile): string {
	return JSON.stringify(file)
}

describe('parseTldrawJsonFile', () => {
	it('returns an error if the file is not json', () => {
		const result = parseTldrawJsonFile(new TldrawEditorConfig(), 'not json')
		assert(!result.ok)
		expect(result.error.type).toBe('notATldrawFile')
	})

	it("returns an error if the file doesn't look like a tldraw file", () => {
		const result = parseTldrawJsonFile(
			new TldrawEditorConfig(),
			JSON.stringify({ not: 'a tldraw file' })
		)
		assert(!result.ok)
		expect(result.error.type).toBe('notATldrawFile')
	})

	it('returns an error if the file version is too old', () => {
		const result = parseTldrawJsonFile(
			new TldrawEditorConfig(),
			serialize({
				tldrawFileFormatVersion: 0,
				schema: new TldrawEditorConfig().storeSchema.serialize(),
				records: [],
			})
		)
		assert(!result.ok)
		expect(result.error.type).toBe('notATldrawFile')
	})

	it('returns an error if the file version is too new', () => {
		const result = parseTldrawJsonFile(
			new TldrawEditorConfig(),
			serialize({
				tldrawFileFormatVersion: 100,
				schema: new TldrawEditorConfig().storeSchema.serialize(),
				records: [],
			})
		)
		assert(!result.ok)
		expect(result.error.type).toBe('fileFormatVersionTooNew')
	})

	it('returns an error if migrations fail', () => {
		const serializedSchema = new TldrawEditorConfig().storeSchema.serialize()
		serializedSchema.storeVersion = 100
		const result = parseTldrawJsonFile(
			new TldrawEditorConfig(),
			serialize({
				tldrawFileFormatVersion: 1,
				schema: serializedSchema,
				records: [],
			})
		)
		assert(!result.ok)
		assert(result.error.type === 'migrationFailed')
		expect(result.error.reason).toBe(MigrationFailureReason.TargetVersionTooOld)

		const serializedSchema2 = new TldrawEditorConfig().storeSchema.serialize()
		serializedSchema2.recordVersions.shape.version = 100
		const result2 = parseTldrawJsonFile(
			new TldrawEditorConfig(),
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
		const result = parseTldrawJsonFile(
			new TldrawEditorConfig(),
			serialize({
				tldrawFileFormatVersion: 1,
				schema: new TldrawEditorConfig().storeSchema.serialize(),
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
			`[ValidationError: At shape(id = shape:shape, type = geo).rotation: Expected number, got undefined]`
		)
	})

	it('returns a store if the file is valid', () => {
		const result = parseTldrawJsonFile(
			new TldrawEditorConfig(),
			serialize({
				tldrawFileFormatVersion: 1,
				schema: new TldrawEditorConfig().storeSchema.serialize(),
				records: [],
			})
		)
		assert(result.ok)
	})
})
