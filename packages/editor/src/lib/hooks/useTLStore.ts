import { useState } from 'react'
import { StoreOptions, createTLStore } from '../config/createTLStore'
import { usePrevious } from './usePrevious'

/** @public */
export function useTLStore(opts: StoreOptions) {
	const [store, setStore] = useState(() => createTLStore(opts))
	const previousOpts = usePrevious(opts)
	if (previousOpts !== opts) {
		const newStore = createTLStore(opts)
		setStore(newStore)
		return newStore
	}
	return store
}
