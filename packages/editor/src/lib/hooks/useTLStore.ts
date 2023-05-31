import { useState } from 'react'
import { StoreOptions, createTLStore } from '../config/createTLStore'

/** @public */
export function useTLStore(opts: StoreOptions) {
	const [store] = useState(() => createTLStore(opts))
	return store
}
