import { TLStoreSnapshot } from '@tldraw/tlschema'
import { areObjectsShallowEqual } from '@tldraw/utils'
import { useState } from 'react'
import { TLEditorSnapshot } from '../..'
import { loadSnapshot } from '../config/TLEditorSnapshot'
import { TLStoreOptions, createTLStore } from '../config/createTLStore'

/** @public */
type UseTLStoreOptions = TLStoreOptions & {
	snapshot?: TLEditorSnapshot | TLStoreSnapshot
}

function createStore(opts: UseTLStoreOptions) {
	const store = createTLStore(opts)
	if (opts.snapshot) {
		loadSnapshot(store, opts.snapshot)
	}
	return { store, opts }
}

/** @public */
export function useTLStore(
	opts: TLStoreOptions & { snapshot?: TLEditorSnapshot | TLStoreSnapshot }
) {
	const [current, setCurrent] = useState(() => createStore(opts))

	if (!areObjectsShallowEqual(current.opts, opts)) {
		const next = createStore(opts)
		setCurrent(next)
		return next.store
	}

	return current.store
}
