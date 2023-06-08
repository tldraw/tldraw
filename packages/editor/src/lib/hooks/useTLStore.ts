import { useState } from 'react'
import { TLStoreOptions, createTLStore } from '../config/createTLStore'
import { usePrevious } from './usePrevious'

/** @public */
export function useTLStore(opts: TLStoreOptions) {
	const [store, setStore] = useState(() => createTLStore(opts))
	const prev = usePrevious(opts)
	if (
		// shallow equality check
		(Object.keys(prev) as (keyof TLStoreOptions)[]).some((key) => prev[key] !== opts[key])
	) {
		const newStore = createTLStore(opts)
		setStore(newStore)
		return newStore
	}
	return store
}
