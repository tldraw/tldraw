import { StoreSnapshot } from '@tldraw/store'
import { TLRecord } from '@tldraw/tlschema'
import { areObjectsShallowEqual } from '@tldraw/utils'
import { useState } from 'react'
import { TLStoreOptions, createTLStore } from '../config/createTLStore'
import { Editor } from '../editor/Editor'
import { TLEditorSnapshot } from '../editor/types/misc-types'

/** @public */
type UseTLStoreOptions = TLStoreOptions & {
	snapshot?: TLEditorSnapshot | StoreSnapshot<TLRecord>
}

function createStore(opts: UseTLStoreOptions) {
	const store = createTLStore(opts)
	if (opts.snapshot) {
		if ('store' in opts.snapshot) {
			// regular old StoreSnapshot
			store.loadSnapshot(opts.snapshot)
		} else {
			// TLEditorSnapshot
			Editor.prototype.loadSnapshot.call({ store }, opts.snapshot)
		}
	}
	return { store, opts }
}

/** @public */
export function useTLStore(
	opts: TLStoreOptions & { snapshot?: TLEditorSnapshot | StoreSnapshot<TLRecord> }
) {
	const [current, setCurrent] = useState(() => createStore(opts))

	if (!areObjectsShallowEqual(current.opts, opts)) {
		const next = createStore(opts)
		setCurrent(next)
		return next.store
	}

	return current.store
}
