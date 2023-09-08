import { StoreSnapshot } from '@tldraw/store'
import { TLRecord } from '@tldraw/tlschema'
import { useEffect, useRef, useState } from 'react'
import { TLStoreOptions, createTLStore } from '../config/createTLStore'

/** @public */
export function useTLStore(opts: TLStoreOptions & { snapshot?: StoreSnapshot<TLRecord> }) {
	const [store, setStore] = useState(() => {
		const store = createTLStore(opts)
		if (opts.snapshot) {
			store.loadSnapshot(opts.snapshot)
		}
		return store
	})
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
		if (opts.snapshot) {
			newStore.loadSnapshot(opts.snapshot)
		}
		setStore(newStore)
		return newStore
	}
	return store
}
