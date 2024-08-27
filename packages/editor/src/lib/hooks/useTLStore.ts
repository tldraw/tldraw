import { areObjectsShallowEqual } from '@tldraw/utils'
import { useState } from 'react'
import {
	TLStoreOptions,
	TLStoreSchemaOptions,
	createTLSchemaFromUtils,
	createTLStore,
} from '../config/createTLStore'

/** @public */
export function useTLStore(opts: TLStoreOptions) {
	const [current, setCurrent] = useState(() => ({ store: createTLStore(opts), opts }))

	if (!areObjectsShallowEqual(current.opts, opts)) {
		const next = { store: createTLStore(opts), opts }
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
