import { TLINSTANCE_ID, TLStore, TLStoreSnapshot, pluckPreservingValues } from '@tldraw/tlschema'
import { filterEntries } from '@tldraw/utils'
import { TLSessionStateSnapshot, loadSessionStateSnapshotIntoStore } from './TLSessionStateSnapshot'

/** @public */
export interface TLEditorSnapshot {
	document: TLStoreSnapshot
	session: TLSessionStateSnapshot
}

/** @public */
export function loadSnapshot(
	store: TLStore,
	_snapshot: Partial<TLEditorSnapshot> | TLStoreSnapshot
) {
	let snapshot: Partial<TLEditorSnapshot> = {}
	if ('store' in _snapshot) {
		// regular old TLStoreSnapshot
		// let's migrate it and then filter out the non-doc state to help folks out
		const migrationResult = store.schema.migrateStoreSnapshot(_snapshot)
		if (migrationResult.type !== 'success') {
			throw new Error('Failed to migrate store snapshot: ' + migrationResult.reason)
		}

		snapshot.document = {
			schema: store.schema.serialize(),
			store: filterEntries(migrationResult.value, (_, { typeName }) =>
				store.scopedTypes.document.has(typeName)
			),
		}
	} else {
		// TLEditorSnapshot
		snapshot = _snapshot
	}
	const preservingInstanceState = pluckPreservingValues(store.get(TLINSTANCE_ID))

	store.atomic(() => {
		// first load the document state (this will wipe the store if it happens)
		if (snapshot.document) {
			store.loadSnapshot(snapshot.document)
		}

		// then make sure we preserve those instance state properties that must be preserved
		// this is a noop if the document state wasn't loaded above
		if (preservingInstanceState) {
			store.update(TLINSTANCE_ID, (r) => ({ ...r, ...preservingInstanceState }))
		}

		// finally reinstate the UI state
		if (snapshot.session) {
			loadSessionStateSnapshotIntoStore(store, snapshot.session)
		}
	})
}
