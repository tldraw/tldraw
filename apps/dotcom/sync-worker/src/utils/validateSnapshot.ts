import { SerializedSchema, SerializedStore } from '@tldraw/store'
import { TLRecord, createTLSchema } from '@tldraw/tlschema'
import { Result, objectMapEntries } from '@tldraw/utils'

interface SnapshotRequestBody {
	schema: SerializedSchema
	snapshot: SerializedStore<TLRecord>
}

const schema = createTLSchema()
export function validateSnapshot(
	body: SnapshotRequestBody
): Result<SerializedStore<TLRecord>, string> {
	const migrationResult = schema.migrateStoreSnapshot({ store: body.snapshot, schema: body.schema })

	if (migrationResult.type === 'error') {
		console.error('Migration error:', migrationResult.reason)
		return Result.err(migrationResult.reason)
	}

	try {
		for (const [id, record] of objectMapEntries(migrationResult.value)) {
			if (id !== record.id) {
				throw new Error(`Record id ${id} does not match record id ${record.id}`)
			}
			const recordType = schema.types[record.typeName]
			if (!recordType) {
				throw new Error(`Missing definition for record type ${record.typeName}`)
			}
			// Legacy cleanup: older clients stored session/presence records in the document.
			if (recordType.scope !== 'document') {
				delete migrationResult.value[id]
				continue
			}
			recordType.validate(record)
		}
	} catch (e: any) {
		console.error('Validation error:', e.message)
		return Result.err(e.message)
	}

	return Result.ok(migrationResult.value)
}
