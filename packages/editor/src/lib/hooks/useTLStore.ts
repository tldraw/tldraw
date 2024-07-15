import { TLStoreSnapshot } from '@tldraw/tlschema'
import { areObjectsShallowEqual } from '@tldraw/utils'
import { useState } from 'react'
import { TLEditorSnapshot, loadSnapshot } from '../config/TLEditorSnapshot'
import {
	TLStoreOptions,
	TLStoreSchemaOptions,
	createTLStore,
	createTLStoreSchema,
} from '../config/createTLStore'

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

/** @public */
export function useTLStoreSchema(opts: TLStoreSchemaOptions) {
	const [current, setCurrent] = useState(() => ({ opts, schema: createTLStoreSchema(opts) }))

	if (!areObjectsShallowEqual(current.opts, opts)) {
		const next = createTLStoreSchema(opts)
		setCurrent({ opts, schema: next })
		return next
	}

	return current.schema
}
