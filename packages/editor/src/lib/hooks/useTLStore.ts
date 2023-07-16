import { useEffect, useRef, useState } from 'react'
import { TLStoreOptions, createTLStore } from '../config/createTLStore'

/** @public */
export function useTLStore(opts: TLStoreOptions) {
	const [store, setStore] = useState(() => createTLStore(opts))
	// prev
	const ref = useRef(opts)
	useEffect(() => void (ref.current = opts))

	if (
		// shallow equality check
		(Object.keys(ref.current) as (keyof TLStoreOptions)[]).some(
			(key) => ref.current[key] !== opts[key]
		)
	) {
		const newStore = createTLStore(opts)
		setStore(newStore)
		return newStore
	}
	return store
}
