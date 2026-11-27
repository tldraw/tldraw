import { Signal } from '@tldraw/state'
import { TLINSTANCE_ID, TLStore, TLStoreSnapshot, pluckPreservingValues } from '@tldraw/tlschema'
import { WeakCache, filterEntries } from '@tldraw/utils'
import {
	TLSessionStateSnapshot,
	createSessionStateSnapshotSignal,
	loadSessionStateSnapshotIntoStore,
} from './TLSessionStateSnapshot'

/** @public */
export interface TLEditorSnapshot {
	document: TLStoreSnapshot
	session: TLSessionStateSnapshot
}

/**
 * Options for {@link loadSnapshot}
 * @public
 */
export interface TLLoadSnapshotOptions {
	/**
	 * By default, some session state flags like `isDebugMode` are not overwritten when loading a snapshot.
	 * These are usually considered "sticky" by users while the document data is not.
	 * If you want to overwrite these flags, set this to `true`.
	 */
	forceOverwriteSessionState?: boolean
}

/**
 * Loads a snapshot into a store.
 * @public
 */
export function loadSnapshot(
	store: TLStore,
	_snapshot: Partial<TLEditorSnapshot> | TLStoreSnapshot,
	opts?: TLLoadSnapshotOptions
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

	// We need to preserve a bunch of instance state properties that the Editor sets
	// to avoid breaking the editor or causing jarring changes when loading a snapshot.
	const preservingInstanceState = pluckPreservingValues(store.get(TLINSTANCE_ID))
	const preservingSessionState = sessionStateCache
		.get(store, createSessionStateSnapshotSignal)
		.get()

	store.atomic(() => {
		// first load the document state (this will wipe the store if it happens)
		if (snapshot.document) {
			store.loadStoreSnapshot(snapshot.document)
		}

		// then make sure we preserve those instance state properties that must be preserved
		// this is a noop if the document state wasn't loaded above
		if (preservingInstanceState) {
			store.update(TLINSTANCE_ID, (r) => ({ ...r, ...preservingInstanceState }))
		}
		if (preservingSessionState) {
			// there's some duplication here with the instanceState but it's fine
			loadSessionStateSnapshotIntoStore(store, preservingSessionState)
		}

		// finally reinstate the UI state
		if (snapshot.session) {
			loadSessionStateSnapshotIntoStore(store, snapshot.session, {
				forceOverwrite: opts?.forceOverwriteSessionState,
			})
		}
	})
}

const sessionStateCache = new WeakCache<
	TLStore,
	Signal<TLSessionStateSnapshot | undefined | null>
>()

/** @public */
export function getSnapshot(store: TLStore): TLEditorSnapshot {
	const sessionState$ = sessionStateCache.get(store, createSessionStateSnapshotSignal)
	const session = sessionState$.get()
	if (!session) {
		throw new Error('Session state is not ready yet')
	}

	return {
		document: store.getStoreSnapshot(),
		session,
	}
}
