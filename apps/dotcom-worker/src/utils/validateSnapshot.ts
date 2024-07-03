import { SerializedSchema, SerializedStore } from '@tldraw/store'
import { TLRecord } from '@tldraw/tlschema'
import { schema } from '@tldraw/tlsync'
import { Result, objectMapEntries } from '@tldraw/utils'

interface SnapshotRequestBody {
	schema: SerializedSchema
	snapshot: SerializedStore<TLRecord>
}

export function validateSnapshot(
	body: SnapshotRequestBody
): Result<SerializedStore<TLRecord>, string> {
	// Migrate the snapshot using the provided schema
	const migrationResult = schema.migrateStoreSnapshot({ store: body.snapshot, schema: body.schema })
	if (migrationResult.type === 'error') {
		return Result.err(migrationResult.reason)
	}

	try {
		for (const [id, record] of objectMapEntries(migrationResult.value)) {
			// Throw if any records have mis-matched ids
			if (id !== record.id) {
				throw new Error(`Record id ${id} does not match record id ${record.id}`)
			}

			// Get the corresponding record type from the provided schema
			const recordType = schema.types[record.typeName]

			// Throw if any records have missing record type definitions
			if (!recordType) {
				throw new Error(`Missing definition for record type ${record.typeName}`)
			}

			// Remove all records whose record type scopes are not 'document'.
			// This is legacy cleanup code.
			if (recordType.scope !== 'document') {
				delete migrationResult.value[id]
				continue
			}

			// Validate the record
			recordType.validate(record)
		}
	} catch (e: any) {
		return Result.err(e.message)
	}

	return Result.ok(migrationResult.value)
}
