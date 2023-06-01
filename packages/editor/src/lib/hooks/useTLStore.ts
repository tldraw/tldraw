import { useState } from 'react'
import { StoreOptions, createTLStore } from '../config/createTLStore'
import { usePrevious } from './usePrevious'

/** @public */
export function useTLStore(opts: StoreOptions) {
	const [store, setStore] = useState(() => createTLStore(opts))
	const prev = usePrevious(opts)
	if (
		// shallow equality check
		(Object.keys(prev) as (keyof StoreOptions)[]).some((key) => prev[key] !== opts[key])
	) {
		const newStore = createTLStore(opts)
		setStore(newStore)
		return newStore
	}
	return store
}
