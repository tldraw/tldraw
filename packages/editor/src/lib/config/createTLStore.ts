import { Store, StoreSnapshot } from '@tldraw/store'
import { TLRecord, TLStore, createTLSchema } from '@tldraw/tlschema'
import { TLShapeInfo } from './createShape'

/** @public */
export type TLStoreOptions = {
	shapes?: TLShapeInfo[]
	initialData?: StoreSnapshot<TLRecord>
	defaultName?: string
}

/**
 * A helper for creating a TLStore. Custom shapes cannot override default shapes.
 *
 * @param opts - Options for creating the store.
 *
 * @public */
export function createTLStore(opts = {} as TLStoreOptions): TLStore {
	const { shapes = [], initialData, defaultName = '' } = opts

	return new Store({
		schema: createTLSchema({ shapes }),
		initialData,
		props: {
			defaultName,
		},
	})
}
