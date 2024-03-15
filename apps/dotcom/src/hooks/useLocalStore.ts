import { schema } from '@tldraw/tlsync'
import { useEffect, useState } from 'react'
import {
	MigrationFailureReason,
	Result,
	SerializedSchema,
	TLRecord,
	TLStore,
	createTLStore,
} from 'tldraw'

export function useLocalStore(records: TLRecord[], serializedSchema: SerializedSchema) {
	const [storeResult, setStoreResult] = useState<
		Result<TLStore, MigrationFailureReason> | undefined
	>(undefined)
	useEffect(() => {
		const store = createTLStore({ schema })
		const snapshot = Object.fromEntries(records.map((r) => [r.id, r]))
		const migrationResult = store.schema.migrateStoreSnapshot({
			store: snapshot,
			schema: serializedSchema,
		})
		if (migrationResult.type === 'error') {
			setStoreResult(Result.err(migrationResult.reason))
			console.error('failed to migrate store', migrationResult)
		} else {
			store.mergeRemoteChanges(() => {
				store.put(Object.values(migrationResult.value), 'initialize')
			})
			setStoreResult(Result.ok(store))
		}
	}, [records, serializedSchema])
	return storeResult
}
