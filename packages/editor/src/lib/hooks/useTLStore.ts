import { TLStoreSnapshot } from '@tldraw/tlschema'
import { areObjectsShallowEqual } from '@tldraw/utils'
import { useState } from 'react'
import { TLEditorSnapshot, loadSnapshot } from '../config/TLEditorSnapshot'
import {
	TLStoreOptions,
	TLStoreSchemaOptions,
	createTLSchemaFromUtils,
	createTLStore,
} from '../config/createTLStore'

/** @public */
type UseTLStoreOptions = TLStoreOptions & {
	snapshot?: Partial<TLEditorSnapshot> | TLStoreSnapshot
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
	opts: TLStoreOptions & { snapshot?: Partial<TLEditorSnapshot> | TLStoreSnapshot }
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
export function useTLSchemaFromUtils(opts: TLStoreSchemaOptions) {
	const [current, setCurrent] = useState(() => ({ opts, schema: createTLSchemaFromUtils(opts) }))

	if (!areObjectsShallowEqual(current.opts, opts)) {
		const next = createTLSchemaFromUtils(opts)
		setCurrent({ opts, schema: next })
		return next
	}

	return current.schema
}
